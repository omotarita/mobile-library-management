import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { sendWelcomeEmail } from '../lib/email'
import { supabase } from '../lib/supabase'
import { generateUniqueUsername } from '../lib/username-generator'
import { useRouter } from '../router'
import { Banner, Button, Card, Field, Select, TextInput } from './ui'

const AGE_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 11]

export default function MemberRegistration() {
  const { navigate } = useRouter()
  const { staff } = useAuth()
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [school, setSchool] = useState('')
  const [trustedAdultName, setTrustedAdultName] = useState('')
  const [trustedAdultEmail, setTrustedAdultEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const canSubmit =
    name.trim() && age && school.trim() && trustedAdultName.trim() && trustedAdultEmail.trim()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!canSubmit) return
    setLoading(true)
    try {
      const username = await generateUniqueUsername()

      const { error: insertError } = await supabase.from('members').insert({
        username,
        name: name.trim(),
        age: Number(age),
        school: school.trim(),
        trusted_adult_name: trustedAdultName.trim(),
        trusted_adult_email: trustedAdultEmail.trim(),
        registered_by: staff?.id ?? null,
      })
      if (insertError) throw insertError

      if (staff) {
        await supabase.from('audit_log').insert({
          admin_id: staff.id,
          action: 'REGISTER_MEMBER',
          target_type: 'member',
          details: { username },
        })
      }

      await sendWelcomeEmail({
        trustedAdultEmail: trustedAdultEmail.trim(),
        memberName: name.trim(),
        memberUsername: username,
      })

      navigate({ name: 'registerMemberConfirm', username, memberName: name.trim() })
    } catch {
      setError('Something went wrong registering this member. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-1">Welcome! This is the mobile library</h1>
      <p className="text-ink/60 mb-6 text-sm">
        We're happy to have you join! To register you, we need an adult present as we need to
        take some details down.
      </p>
      {error && <Banner tone="error">{error}</Banner>}
      <form onSubmit={handleSubmit}>
        <Field label="Child's name" htmlFor="reg-name">
          <TextInput id="reg-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Age" htmlFor="reg-age">
          <Select id="reg-age" value={age} onChange={(e) => setAge(e.target.value)}>
            <option value="">Select age</option>
            {AGE_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="School" htmlFor="reg-school">
          <TextInput id="reg-school" value={school} onChange={(e) => setSchool(e.target.value)} />
        </Field>
        <Field label="Trusted adult's name" htmlFor="reg-adult-name">
          <TextInput
            id="reg-adult-name"
            value={trustedAdultName}
            onChange={(e) => setTrustedAdultName(e.target.value)}
          />
        </Field>
        <Field label="Trusted adult's email" htmlFor="reg-adult-email">
          <TextInput
            id="reg-adult-email"
            type="email"
            value={trustedAdultEmail}
            onChange={(e) => setTrustedAdultEmail(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={!canSubmit || loading} className="w-full">
          {loading ? 'Registering…' : 'Register'}
        </Button>
      </form>
    </Card>
  )
}
