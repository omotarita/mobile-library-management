import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project details.'
  )
}

// Staff (volunteers/admins) sign in via Supabase Auth (real email +
// password). Members (children) never authenticate — a signed-in staff
// member looks them up by username on their behalf. See README for the
// full access-control rationale (RLS + why members don't need accounts).
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')
