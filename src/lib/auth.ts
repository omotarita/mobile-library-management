import { createContext, useContext } from 'react'
import type { Admin } from '../types'
import { supabase } from './supabase'

export interface AuthContextValue {
  staff: Admin | null
  loading: boolean
  login: (email: string, password: string) => Promise<Admin>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

/** Looks up the admins row linked to a signed-in Supabase Auth user. */
export async function fetchAdminProfile(authUserId: string): Promise<Admin | null> {
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (error) throw error
  return (data as Admin) ?? null
}

/**
 * Signs a staff member (volunteer or admin) in with a real email + password
 * via Supabase Auth. Members (children) never go through this — only staff.
 */
export async function signInStaff(email: string, password: string): Promise<Admin> {
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (authError) throw new Error('INVALID_CREDENTIALS')

  const { data: sessionData } = await supabase.auth.getSession()
  const authUserId = sessionData.session?.user.id
  const admin = authUserId ? await fetchAdminProfile(authUserId) : null

  if (!admin || admin.status !== 'active') {
    await supabase.auth.signOut()
    throw new Error('NOT_AUTHORIZED')
  }

  await supabase.from('admins').update({ last_login: new Date().toISOString() }).eq('id', admin.id)

  return admin
}

export async function signOutStaff(): Promise<void> {
  await supabase.auth.signOut()
}
