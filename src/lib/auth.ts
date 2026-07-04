import { createContext, useContext } from 'react'
import type { Admin } from '../types'
import { supabase } from './supabase'

const STORAGE_KEY = 'mobile-library-staff'

export interface AuthContextValue {
  staff: Admin | null
  login: (username: string) => Promise<Admin>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function loadStoredStaff(): Admin | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Admin) : null
  } catch {
    return null
  }
}

export function storeStaff(admin: Admin | null) {
  if (admin) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(admin))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

/**
 * Looks up a staff member (admin or volunteer) by username only — there is
 * no password. Only 'active' accounts may sign in.
 */
export async function findStaffByUsername(username: string): Promise<Admin> {
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .ilike('username', username.trim())
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('NOT_FOUND')
  if (data.status !== 'active') throw new Error('INACTIVE')

  await supabase.from('admins').update({ last_login: new Date().toISOString() }).eq('id', data.id)

  return data as Admin
}
