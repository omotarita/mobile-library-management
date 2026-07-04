import type { ReactNode } from 'react'
import { useAuth } from '../lib/auth'
import { useRouter } from '../router'

interface LayoutProps {
  children: ReactNode
  showHome?: boolean
  onBack?: () => void
}

export default function Layout({ children, showHome = true, onBack }: LayoutProps) {
  const { navigate } = useRouter()
  const { staff, logout } = useAuth()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-coral-500 text-white px-4 py-3 sm:px-6 flex items-center justify-between shadow-sm">
        <button
          type="button"
          onClick={() => navigate({ name: 'home' })}
          className="flex items-center gap-2 text-lg sm:text-xl font-bold tracking-tight"
        >
          <span aria-hidden="true">📚</span>
          <span>Mobile Library</span>
        </button>
        <div className="flex items-center gap-3">
          {staff && (
            <span className="hidden sm:inline text-coral-50 text-sm">
              Signed in as <strong>{staff.name}</strong>
            </span>
          )}
          {staff && (
            <button
              type="button"
              onClick={logout}
              className="text-sm bg-coral-600 hover:bg-coral-700 transition-colors px-3 py-1.5 rounded-full"
            >
              Switch user
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-10 max-w-3xl w-full mx-auto">
        {(onBack || showHome) && (
          <div className="mb-4 flex gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="text-teal-600 font-semibold hover:text-teal-700"
              >
                ← Back
              </button>
            )}
            {showHome && !onBack && (
              <button
                type="button"
                onClick={() => navigate({ name: 'home' })}
                className="text-teal-600 font-semibold hover:text-teal-700"
              >
                ← Home
              </button>
            )}
          </div>
        )}
        {children}
      </main>

      <footer className="text-center text-xs text-ink/50 py-4">
        Mobile Library Management
      </footer>
    </div>
  )
}
