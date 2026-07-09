import { createContext, useContext } from 'react'
import type { Member } from './types'

export type StaffIntent = 'borrow' | 'return' | 'admin'

export type Route =
  | { name: 'home' }
  | { name: 'staffLogin'; intent: StaffIntent }
  | { name: 'memberLookup'; mode: 'borrow' | 'return' }
  | { name: 'registerMember' }
  | { name: 'registerMemberConfirm'; username: string; memberName: string }
  | { name: 'borrow'; member: Member }
  | { name: 'borrowConfirm'; memberUsername: string; bookTitle: string; bookAuthor: string; dueDateIso: string; totalBorrowed: number }
  | { name: 'return'; member: Member }
  | { name: 'returnConfirm'; bookTitle: string; bookAuthor: string }
  | { name: 'adminDashboard' }
  | { name: 'adminBooks' }
  | { name: 'adminMembers' }
  | { name: 'adminMemberDetail'; memberId: string }
  | { name: 'adminRegister' }
  | { name: 'adminRegisterConfirm'; adminName: string; email: string; role: string }
  | { name: 'adminAuditLog' }

export interface RouterContextValue {
  navigate: (route: Route) => void
}

export const RouterContext = createContext<RouterContextValue | null>(null)

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext)
  if (!ctx) throw new Error('useRouter must be used within App')
  return ctx
}
