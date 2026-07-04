import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { useRouter, type StaffIntent } from '../router'
import { Banner, Button, Card, Field, TextInput } from './ui'

export default function StaffLogin({ intent }: { intent: StaffIntent }) {
  const { login } = useAuth()
  const { navigate } = useRouter()
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!username.trim()) return
    setLoading(true)
    try {
      await login(username)
      if (intent === 'admin') {
        navigate({ name: 'adminDashboard' })
      } else {
        navigate({ name: 'memberLookup', mode: intent })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message === 'NOT_FOUND' || message === 'INACTIVE') {
        setError('Only registered volunteers can access this site.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-1">Staff sign-in</h1>
      <p className="text-ink/60 mb-6 text-sm">
        Enter your volunteer or admin username to continue. No password needed.
      </p>
      {error && <Banner tone="error">{error}</Banner>}
      <form onSubmit={handleSubmit}>
        <Field label="Username" htmlFor="staff-username">
          <TextInput
            id="staff-username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your staff username"
          />
        </Field>
        <Button type="submit" disabled={loading || !username.trim()} className="w-full">
          {loading ? 'Checking…' : 'Continue'}
        </Button>
      </form>
    </Card>
  )
}
