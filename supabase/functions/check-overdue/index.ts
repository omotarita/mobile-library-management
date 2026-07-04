// Supabase Edge Function: daily book due-date check.
//
// Triggered on a schedule by the GitHub Actions workflow at
// .github/workflows/check-overdue.yml (see README for why GitHub Actions
// cron is used instead of pg_cron). It scans every active (unreturned)
// borrow and sends:
//   - a "due tomorrow" reminder, 1 day before the due date
//   - a 1-day-overdue reminder
//   - a 7-day-overdue reminder
// using the due_soon_email_sent / overdue_email_1_sent / overdue_email_7_sent
// flags to avoid duplicate sends. Requires RESEND_API_KEY and
// RESEND_FROM_EMAIL to be set as Supabase project secrets (see README).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendEmail } from '../_shared/resend.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface ActiveBorrowRow {
  id: string
  due_date: string
  due_soon_email_sent: boolean
  overdue_email_1_sent: boolean
  overdue_email_7_sent: boolean
  book: { title: string; author: string; status: string } | null
  member: { username: string; name: string; trusted_adult_email: string } | null
}

function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

// Whole calendar days between now and due_date, ignoring time-of-day, so a
// borrow due at any time "tomorrow" reliably gets exactly one due-soon email
// regardless of what time this function happens to run.
function daysUntilDue(dueDateIso: string): number {
  const startOfToday = new Date()
  startOfToday.setUTCHours(0, 0, 0, 0)
  const dueDay = new Date(dueDateIso)
  dueDay.setUTCHours(0, 0, 0, 0)
  return Math.round((dueDay.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24))
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: activeRows, error } = await supabase
    .from('borrow_records')
    .select(
      'id, due_date, due_soon_email_sent, overdue_email_1_sent, overdue_email_7_sent, book:books(title, author, status), member:members(username, name, trusted_adult_email)'
    )
    .is('returned_at', null)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const rows = (activeRows as unknown as ActiveBorrowRow[]) ?? []
  let sentDueSoon = 0
  let sent1 = 0
  let sent7 = 0
  let skipped = 0

  for (const row of rows) {
    if (!row.book || !row.member || row.book.status === 'lost' || row.book.status === 'damaged') {
      skipped++
      continue
    }

    const days = daysUntilDue(row.due_date)
    const dueDateStr = formatDueDate(row.due_date)

    if (days === 1 && !row.due_soon_email_sent) {
      await sendEmail({
        to: row.member.trusted_adult_email,
        subject: `Reminder: ${row.member.username}'s library book is due back tomorrow`,
        body: `"${row.book.title}" by ${row.book.author} is due back at the mobile library tomorrow (${dueDateStr}). Thanks for helping ${row.member.name} bring it back on time!`,
      })
      await supabase.from('borrow_records').update({ due_soon_email_sent: true }).eq('id', row.id)
      sentDueSoon++
      continue
    }

    if (days <= -1 && !row.overdue_email_1_sent) {
      await sendEmail({
        to: row.member.trusted_adult_email,
        subject: `${row.member.username}'s library book is overdue`,
        body: `"${row.book.title}" by ${row.book.author} was due on ${dueDateStr}. Please help ${row.member.name} return it to the mobile library.`,
      })
      await supabase.from('borrow_records').update({ overdue_email_1_sent: true }).eq('id', row.id)
      sent1++
    }

    if (days <= -7 && !row.overdue_email_7_sent) {
      await sendEmail({
        to: row.member.trusted_adult_email,
        subject: `Reminder: ${row.member.username}'s library book is still overdue`,
        body: `"${row.book.title}" by ${row.book.author} is now 7 days overdue (was due ${dueDateStr}). Please ensure it is returned as soon as possible.`,
      })
      await supabase.from('borrow_records').update({ overdue_email_7_sent: true }).eq('id', row.id)
      sent7++
    }
  }

  return new Response(
    JSON.stringify({ checked: rows.length, sentDueSoon, sent1, sent7, skipped }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
