import { useAuth } from '../lib/auth'
import { useRouter } from '../router'
import { Card } from './ui'

export default function Home() {
  const { navigate } = useRouter()
  const { staff } = useAuth()

  function go(intent: 'borrow' | 'return' | 'admin') {
    if (!staff) {
      navigate({ name: 'staffLogin', intent })
      return
    }
    if (intent === 'admin') {
      navigate({ name: 'adminDashboard' })
    } else {
      navigate({ name: 'memberLookup', mode: intent })
    }
  }

  return (
    <div className="text-center">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-coral-600 mb-2">Mobile Library</h1>
      <p className="text-ink/70 mb-10 text-lg">What would you like to do?</p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex flex-col items-center gap-4 hover:shadow-md transition-shadow">
          <span className="text-5xl" aria-hidden="true">📖</span>
          <h2 className="text-xl font-bold">Borrowing</h2>
          <button
            type="button"
            onClick={() => go('borrow')}
            className="w-full rounded-xl bg-coral-500 hover:bg-coral-600 text-white font-semibold py-3 min-h-12"
          >
            Borrow a book
          </button>
        </Card>

        <Card className="flex flex-col items-center gap-4 hover:shadow-md transition-shadow">
          <span className="text-5xl" aria-hidden="true">📗</span>
          <h2 className="text-xl font-bold">Returning</h2>
          <button
            type="button"
            onClick={() => go('return')}
            className="w-full rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 min-h-12"
          >
            Return a book
          </button>
        </Card>

        <Card className="flex flex-col items-center gap-4 hover:shadow-md transition-shadow">
          <span className="text-5xl" aria-hidden="true">🗂️</span>
          <h2 className="text-xl font-bold">Admin</h2>
          <button
            type="button"
            onClick={() => go('admin')}
            className="w-full rounded-xl bg-berry-500 hover:bg-berry-600 text-white font-semibold py-3 min-h-12"
          >
            Admin area
          </button>
        </Card>
      </div>

      <p className="mt-10 text-xs text-ink/40">Only registered volunteers can access this site</p>
    </div>
  )
}
