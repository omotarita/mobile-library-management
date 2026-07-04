import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project details.'
  )
}

// No Supabase Auth is used — this is a trusted, in-person, low-risk system
// with username-only lookups. See README for the access-control rationale.
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')
