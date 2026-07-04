// TODO: wire this up to a real transactional email provider (e.g. Resend's
// free tier — 100 emails/day) via a Supabase Edge Function. For now every
// "send" just logs to the console so the rest of the app can be built and
// tested without an email account. Swap the body of `sendEmail` for a
// `fetch()` call to your edge function once you're ready; every call site
// in this app already goes through this one function.

interface EmailPayload {
  to: string
  subject: string
  body: string
}

async function sendEmail({ to, subject, body }: EmailPayload): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`[email stub] To: ${to}\nSubject: ${subject}\n\n${body}\n`)
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
