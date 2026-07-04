import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from '../router'
import type { Member } from '../types'
import { Banner, Button, Card, Field, TextInput } from './ui'

export default function MemberLookup({ mode }: { mode: 'borrow' | 'return' }) {
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
      const { data, error: dbError } = await supabase
        .from('members')
        .select('*')
        .ilike('username', username.trim())
        .maybeSingle()

      if (dbError) throw dbError
      if (!data) {
        setError("We couldn't find a member with that username. Check the spelling, or sign up below.")
        return
      }
      navigate({ name: mode, member: data as Member })
    } catch {
      setError('Something went wrong looking that up. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const title = mode === 'borrow' ? 'Borrow a book' : 'Return a book'

  return (
    <Card className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-1">{title}</h1>
      <p className="text-ink/60 mb-6 text-sm">What's the member's username?</p>
      {error && <Banner tone="error">{error}</Banner>}
      <form onSubmit={handleSubmit}>
        <Field label="Member username" htmlFor="member-username">
          <TextInput
            id="member-username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. Silly Bear"
          />
        </Field>
        <Button type="submit" disabled={loading || !username.trim()} className="w-full">
          {loading ? 'Looking up…' : 'Continue'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink/60">
        First time?{' '}
        <button
          type="button"
          onClick={() => navigate({ name: 'registerMember' })}
          className="text-teal-600 font-semibold hover:underline"
        >
          Sign up here
        </button>
      </p>
    </Card>
  )
}
