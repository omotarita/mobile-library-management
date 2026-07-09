import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { useRouter, type StaffIntent } from '../router'
import { Banner, Button, Card, Field, TextInput } from './ui'

export default function StaffLogin({ intent }: { intent: StaffIntent }) {
  const { login } = useAuth()
  const { navigate } = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) return
    setLoading(true)
    try {
      await login(email, password)
      if (intent === 'admin') {
        navigate({ name: 'adminDashboard' })
      } else {
        navigate({ name: 'memberLookup', mode: intent })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message === 'INVALID_CREDENTIALS') {
        setError('Incorrect email or password.')
      } else if (message === 'NOT_AUTHORIZED') {
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
      <p className="text-ink/60 mb-6 text-sm">Enter your volunteer or admin email and password.</p>
      {error && <Banner tone="error">{error}</Banner>}
      <form onSubmit={handleSubmit}>
        <Field label="Email" htmlFor="staff-email">
          <TextInput
            id="staff-email"
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password" htmlFor="staff-password">
          <TextInput
            id="staff-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={loading || !email.trim() || !password} className="w-full">
          {loading ? 'Checking…' : 'Continue'}
        </Button>
      </form>
    </Card>
  )
}
