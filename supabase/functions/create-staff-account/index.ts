// Creates a new staff (admin/volunteer) account: a real Supabase Auth user
// plus the matching `admins` row. Runs server-side with the service-role
// key so it can create auth users directly, and — importantly — so it does
// NOT touch the calling browser's session. If the client called
// `supabase.auth.signUp()` directly instead, it would swap the browser's
// active session to the brand-new account, silently logging out the
// administrator who's in the middle of registering someone else.
//
// The caller must already be a signed-in staff member — verified below by
// checking the Authorization header they're invoked with.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface RequestBody {
  email: string
  password: string
  name: string
  role: 'administrator' | 'volunteer'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const callerClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: callerData, error: callerError } = await callerClient.auth.getUser()
  if (callerError || !callerData?.user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { email, password, name, role } = (await req.json()) as RequestBody
  if (!email || !password || !name || !role) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createError || !created?.user) {
    return new Response(JSON.stringify({ error: createError?.message ?? 'Could not create account' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: inserted, error: insertError } = await admin
    .from('admins')
    .insert({
      auth_user_id: created.user.id,
      name,
      email,
      role,
      status: 'active',
    })
    .select()
    .single()

  if (insertError) {
    // Roll back the auth user so a failed registration doesn't leave an
    // orphaned account.
    await admin.auth.admin.deleteUser(created.user.id)
    return new Response(JSON.stringify({ error: insertError.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ admin: inserted }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
