// Thin wrapper around Resend's email API, shared by the send-email and
// check-overdue edge functions. Requires two secrets set on the Supabase
// project (see README):
//   RESEND_API_KEY    — from resend.com
//   RESEND_FROM_EMAIL  — e.g. "Mobile Library <library@yourdomain.com>",
//                        using a domain verified in your Resend account

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL')

export async function sendEmail(opts: { to: string; subject: string; body: string }): Promise<void> {
  if (!RESEND_API_KEY || !FROM_EMAIL) {
    throw new Error('RESEND_API_KEY / RESEND_FROM_EMAIL are not configured on this Supabase project.')
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [opts.to],
      subject: opts.subject,
      text: opts.body,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Resend API error (${res.status}): ${errText}`)
  }
}
