// Public edge function invoked from the browser (via
// `supabase.functions.invoke('send-email', ...)`) for every user-triggered
// email: member registration, borrow confirmation, return confirmation,
// and new-admin welcome. The daily overdue/due-soon reminders are sent
// separately by the check-overdue function, which shares the same Resend
// wrapper but isn't triggered from the browser.

import { sendEmail } from '../_shared/resend.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const { to, subject, body } = await req.json()
    if (!to || !subject || !body) {
      return new Response(JSON.stringify({ error: 'Missing to/subject/body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await sendEmail({ to, subject, body })
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
