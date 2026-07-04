import { useAuth } from '../../lib/auth'
import { useRouter, type Route } from '../../router'

const TABS: { route: Route['name']; label: string }[] = [
  { route: 'adminDashboard', label: 'Dashboard' },
  { route: 'adminBooks', label: 'Books' },
  { route: 'adminMembers', label: 'Members' },
]

export default function AdminNav({ active }: { active: Route['name'] }) {
  const { navigate } = useRouter()
  const { staff } = useAuth()
  const isAdministrator = staff?.role === 'administrator'

  const tabs = [
    ...TABS,
    ...(isAdministrator ? [{ route: 'adminAuditLog' as const, label: 'Audit log' }] : []),
  ]

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-ink/10 pb-3">
      {tabs.map((tab) => (
        <button
          key={tab.route}
          type="button"
          onClick={() => navigate({ name: tab.route } as Route)}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
            active === tab.route
              ? 'bg-coral-500 text-white'
              : 'bg-white text-ink/70 hover:bg-coral-50 border border-ink/10'
          }`}
        >
          {tab.label}
        </button>
      ))}
      {isAdministrator && (
        <button
          type="button"
          onClick={() => navigate({ name: 'adminRegister' })}
          className="ml-auto px-4 py-2 rounded-full text-sm font-semibold bg-berry-500 text-white hover:bg-berry-600"
        >
          + Register new admin
        </button>
      )}
    </nav>
  )
}
