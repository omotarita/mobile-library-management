import { useEffect, useMemo, useState } from 'react'
import { AuthContext, fetchAdminProfile, signInStaff, signOutStaff } from './lib/auth'
import { formatDate, ordinal } from './lib/format'
import { supabase } from './lib/supabase'
import { RouterContext, type Route } from './router'
import type { Admin } from './types'

import Layout from './components/Layout'
import Home from './components/Home'
import StaffLogin from './components/StaffLogin'
import MemberLookup from './components/MemberLookup'
import MemberRegistration from './components/MemberRegistration'
import BorrowFlow from './components/BorrowFlow'
import ReturnFlow from './components/ReturnFlow'
import Confirmation from './components/Confirmation'
import AdminDashboard from './components/admin/AdminDashboard'
import BooksTable from './components/admin/BooksTable'
import MembersTable from './components/admin/MembersTable'
import MemberDetail from './components/admin/MemberDetail'
import AdminRegistration from './components/admin/AdminRegistration'
import AuditLog from './components/admin/AuditLog'
import { Spinner } from './components/ui'

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' })
  const [staff, setStaff] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function restoreSession() {
      const { data } = await supabase.auth.getSession()
      const authUserId = data.session?.user.id
      const admin = authUserId ? await fetchAdminProfile(authUserId) : null
      if (active) {
        setStaff(admin)
        setLoading(false)
      }
    }
    void restoreSession()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setStaff(null)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const authValue = useMemo(
    () => ({
      staff,
      loading,
      login: async (email: string, password: string) => {
        const admin = await signInStaff(email, password)
        setStaff(admin)
        return admin
      },
      logout: async () => {
        await signOutStaff()
        setStaff(null)
        setRoute({ name: 'home' })
      },
    }),
    [staff, loading]
  )

  const routerValue = useMemo(() => ({ navigate: (r: Route) => setRoute(r) }), [])

  if (loading) {
    return <Spinner />
  }

  return (
    <AuthContext.Provider value={authValue}>
      <RouterContext.Provider value={routerValue}>
        <Layout showHome={route.name !== 'home'}>{renderRoute(route, setRoute)}</Layout>
      </RouterContext.Provider>
    </AuthContext.Provider>
  )
}

function renderRoute(route: Route, navigate: (r: Route) => void) {
  switch (route.name) {
    case 'home':
      return <Home />

    case 'staffLogin':
      return <StaffLogin intent={route.intent} />

    case 'memberLookup':
      return <MemberLookup mode={route.mode} />

    case 'registerMember':
      return <MemberRegistration />

    case 'registerMemberConfirm':
      return (
        <Confirmation
          heading={`Welcome, ${route.username}!`}
          lines={[
            "You're now registered as a library member!",
            <>Your username is <strong>{route.username}</strong> — this is what you'll use to borrow books.</>,
            "We'll send confirmation of your membership details to your trusted adult.",
            'See you soon!',
          ]}
          onDone={() => navigate({ name: 'home' })}
        />
      )

    case 'borrow':
      return <BorrowFlow member={route.member} />

    case 'borrowConfirm':
      return (
        <Confirmation
          heading="You've borrowed a new book!"
          lines={[
            <>
              You've just borrowed your {ordinal(route.totalBorrowed)} book — "{route.bookTitle}" by{' '}
              {route.bookAuthor}!
            </>,
            "We've sent a confirmation to your trusted adult.",
            <>Bring the book back by <strong>{formatDate(route.dueDateIso)}</strong>.</>,
            'Happy reading!',
          ]}
          onDone={() => navigate({ name: 'home' })}
        />
      )

    case 'return':
      return <ReturnFlow member={route.member} />

    case 'returnConfirm':
      return (
        <Confirmation
          emoji="📗"
          heading="You've returned a book!"
          lines={[
            <>
              You've just returned "{route.bookTitle}" by {route.bookAuthor}!
            </>,
            'Thanks for bringing it back. We hope you loved it!',
          ]}
          onDone={() => navigate({ name: 'home' })}
        />
      )

    case 'adminDashboard':
      return <AdminDashboard />

    case 'adminBooks':
      return <BooksTable />

    case 'adminMembers':
      return <MembersTable />

    case 'adminMemberDetail':
      return <MemberDetail memberId={route.memberId} />

    case 'adminRegister':
      return <AdminRegistration />

    case 'adminRegisterConfirm':
      return (
        <Confirmation
          heading={`Welcome, ${route.username}!`}
          lines={[
            <>You're now registered as a library <strong>{route.role}</strong>.</>,
            <>Your username is <strong>{route.username}</strong> — this is what you'll use to log into the site.</>,
          ]}
          onDone={() => navigate({ name: 'adminDashboard' })}
        />
      )

    case 'adminAuditLog':
      return <AuditLog />

    default:
      return <Home />
  }
}

