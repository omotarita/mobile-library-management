// Sends via the `send-email` Supabase Edge Function, which calls Resend.
// Every call site in this app goes through this one function. A failed
// send is logged but never blocks the borrow/return/registration flow —
// the database action has already succeeded by the time we email, so a
// flaky email shouldn't surface as an app error to the volunteer.
import { supabase } from './supabase'

interface EmailPayload {
  to: string
  subject: string
  body: string
}

async function sendEmail({ to, subject, body }: EmailPayload): Promise<void> {
  const { error } = await supabase.functions.invoke('send-email', {
    body: { to, subject, body },
  })
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to send email:', error)
  }
}

function formatDueDate(dueDateIso: string): string {
  return new Date(dueDateIso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export async function sendBorrowConfirmationEmail(opts: {
  trustedAdultEmail: string
  memberName: string
  memberUsername: string
  bookTitle: string
  bookAuthor: string
  dueDateIso: string
}) {
  await sendEmail({
    to: opts.trustedAdultEmail,
    subject: `${opts.memberUsername} borrowed a library book`,
    body: `${opts.memberName} (${opts.memberUsername}) has borrowed "${opts.bookTitle}" by ${opts.bookAuthor} from the mobile library. Please help them bring it back by ${formatDueDate(opts.dueDateIso)}.`,
  })
}

export async function sendReturnConfirmationEmail(opts: {
  trustedAdultEmail: string
  memberName: string
  memberUsername: string
  bookTitle: string
  bookAuthor: string
}) {
  await sendEmail({
    to: opts.trustedAdultEmail,
    subject: `${opts.memberUsername} returned a library book`,
    body: `${opts.memberName} (${opts.memberUsername}) has returned "${opts.bookTitle}" by ${opts.bookAuthor} to the mobile library. Thanks for helping them bring it back!`,
  })
}

export async function sendWelcomeEmail(opts: {
  trustedAdultEmail: string
  memberName: string
  memberUsername: string
}) {
  await sendEmail({
    to: opts.trustedAdultEmail,
    subject: `${opts.memberName} is now a mobile library member!`,
    body: `${opts.memberName} has registered as a member of the mobile library. Their username is "${opts.memberUsername}" — they'll use this to borrow and return books. See you soon!`,
  })
}

export async function sendAdminWelcomeEmail(opts: {
  contactEmail: string
  name: string
  username: string
  role: string
}) {
  await sendEmail({
    to: opts.contactEmail,
    subject: `Welcome to the Mobile Library team, ${opts.name}!`,
    body: `You're now registered as a library ${opts.role}. Your username is "${opts.username}" — use this to log into the site (no password needed).`,
  })
}

export async function sendOverdueEmail(opts: {
  trustedAdultEmail: string
  memberUsername: string
  memberName: string
  bookTitle: string
  bookAuthor: string
  dueDateIso: string
  daysOverdue: 1 | 7
}) {
  const dueDateStr = formatDueDate(opts.dueDateIso)
  if (opts.daysOverdue === 1) {
    await sendEmail({
      to: opts.trustedAdultEmail,
      subject: `${opts.memberUsername}'s library book is overdue`,
      body: `"${opts.bookTitle}" by ${opts.bookAuthor} was due on ${dueDateStr}. Please help ${opts.memberName} return it to the mobile library.`,
    })
  } else {
    await sendEmail({
      to: opts.trustedAdultEmail,
      subject: `Reminder: ${opts.memberUsername}'s library book is still overdue`,
      body: `"${opts.bookTitle}" by ${opts.bookAuthor} is now 7 days overdue (was due ${dueDateStr}). Please ensure it is returned as soon as possible.`,
    })
  }
}
