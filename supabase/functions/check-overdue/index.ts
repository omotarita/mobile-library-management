// Supabase Edge Function: daily overdue-book check.
//
// Triggered on a schedule by the GitHub Actions workflow at
// .github/workflows/check-overdue.yml (see README for why GitHub Actions
// cron is used instead of pg_cron). It scans for active borrows past their
// due date and sends the 1-day and 7-day overdue reminder emails, using
// the overdue_email_1_sent / overdue_email_7_sent flags to avoid duplicates.
//
// Email sending is currently a console.log stub — see the TODO below to
// wire in a real provider (e.g. Resend's free tier).

import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface OverdueRow {
  id: string
  due_date: string
  overdue_email_1_sent: boolean
  overdue_email_7_sent: boolean
  book: { title: string; author: string; status: string } | null
  member: { username: string; name: string; trusted_adult_email: string } | null
}

// TODO: replace with a real transactional email call, e.g.:
//   await fetch('https://api.resend.com/emails', { method: 'POST', headers: {...}, body: JSON.stringify({...}) })
async function sendOverdueEmail(opts: {
  to: string
  memberUsername: string
  memberName: string
  bookTitle: string
  bookAuthor: string
  dueDate: string
  daysOverdue: 1 | 7
}) {
  const dueDateStr = new Date(opts.dueDate).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const subject =
    opts.daysOverdue === 1
      ? `${opts.memberUsername}'s library book is overdue`
      : `Reminder: ${opts.memberUsername}'s library book is still overdue`
  const body =
    opts.daysOverdue === 1
      ? `"${opts.bookTitle}" by ${opts.bookAuthor} was due on ${dueDateStr}. Please help ${opts.memberName} return it to the mobile library.`
      : `"${opts.bookTitle}" by ${opts.bookAuthor} is now 7 days overdue (was due ${dueDateStr}). Please ensure it is returned as soon as possible.`

  console.log(`[email stub] To: ${opts.to}\nSubject: ${subject}\n\n${body}\n`)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: overdueRows, error } = await supabase
    .from('borrow_records')
    .select(
      'id, due_date, overdue_email_1_sent, overdue_email_7_sent, book:books(title, author, status), member:members(username, name, trusted_adult_email)'
    )
    .is('returned_at', null)
    .lt('due_date', new Date().toISOString())

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const rows = (overdueRows as unknown as OverdueRow[]) ?? []
  let sent1 = 0
  let sent7 = 0
  let skipped = 0

  for (const row of rows) {
    if (!row.book || !row.member || row.book.status === 'lost' || row.book.status === 'damaged') {
      skipped++
      continue
    }

    const daysOverdue = Math.floor((Date.now() - new Date(row.due_date).getTime()) / (1000 * 60 * 60 * 24))

    if (daysOverdue >= 1 && !row.overdue_email_1_sent) {
      await sendOverdueEmail({
        to: row.member.trusted_adult_email,
        memberUsername: row.member.username,
        memberName: row.member.name,
        bookTitle: row.book.title,
        bookAuthor: row.book.author,
        dueDate: row.due_date,
        daysOverdue: 1,
      })
      await supabase.from('borrow_records').update({ overdue_email_1_sent: true }).eq('id', row.id)
      sent1++
    }

    if (daysOverdue >= 7 && !row.overdue_email_7_sent) {
      await sendOverdueEmail({
        to: row.member.trusted_adult_email,
        memberUsername: row.member.username,
        memberName: row.member.name,
        bookTitle: row.book.title,
        bookAuthor: row.book.author,
        dueDate: row.due_date,
        daysOverdue: 7,
      })
      await supabase.from('borrow_records').update({ overdue_email_7_sent: true }).eq('id', row.id)
      sent7++
    }
  }

  return new Response(
    JSON.stringify({ checked: rows.length, sent1, sent7, skipped }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
