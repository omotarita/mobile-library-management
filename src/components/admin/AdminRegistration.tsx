import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../../lib/auth'
import { sendAdminWelcomeEmail } from '../../lib/email'
import { supabase } from '../../lib/supabase'
import { useRouter } from '../../router'
import type { AdminRole } from '../../types'
import { Banner, Button, Card, Field, Select, TextInput } from '../ui'
import AdminNav from './AdminNav'

const REGISTRATION_CODE = '9999'
const MIN_PASSWORD_LENGTH = 6

export default function AdminRegistration() {
  const { staff } = useAuth()
  const { navigate } = useRouter()

  const [codeVerified, setCodeVerified] = useState(false)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<AdminRole>('volunteer')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleCodeSubmit(e: FormEvent) {
    e.preventDefault()
    if (code.trim() === REGISTRATION_CODE) {
      setCodeVerified(true)
      setCodeError(null)
    } else {
      setCodeError('That code is incorrect.')
    }
  }

  const canSubmit =
    name.trim() &&
    email.trim() &&
    username.trim() &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password === confirmPassword

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!canSubmit) return
    setLoading(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-staff-account', {
        body: {
          email: email.trim(),
          password,
          name: name.trim(),
          username: username.trim(),
          role,
        },
      })

      if (fnError) {
        let message = 'Something went wrong. Please try again.'
        try {
          const body = await (fnError as { context?: { json: () => Promise<{ error?: string }> } }).context?.json?.()
          if (body?.error) {
            message = /duplicate|unique|already/i.test(body.error)
              ? 'That username or email is already taken. Please choose another.'
              : body.error
          }
        } catch {
          // fall back to the generic message above
        }
        setError(message)
        return
      }

      await supabase.from('audit_log').insert({
        admin_id: staff?.id,
        action: 'REGISTER_ADMIN',
        target_type: 'admin',
        target_id: data?.admin?.id,
        details: { username: username.trim(), role },
      })

      await sendAdminWelcomeEmail({
        contactEmail: email.trim(),
        name: name.trim(),
        username: username.trim(),
        role,
      })

      navigate({ name: 'adminRegisterConfirm', username: username.trim(), role })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (staff?.role !== 'administrator') {
    return (
      <div>
        <AdminNav active="adminRegister" />
        <Banner tone="error">Only administrators can register new admins.</Banner>
      </div>
    )
  }

  if (!codeVerified) {
    return (
      <Card className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-1">Registering a new admin?</h1>
        <p className="text-ink/60 mb-6 text-sm">Enter the admin registration code to continue.</p>
        {codeError && <Banner tone="error">{codeError}</Banner>}
        <form onSubmit={handleCodeSubmit}>
          <Field label="Registration code" htmlFor="reg-code">
            <TextInput
              id="reg-code"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
            />
          </Field>
          <Button type="submit" disabled={!code.trim()} className="w-full">
            Continue
          </Button>
        </form>
      </Card>
    )
  }

  return (
    <Card className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">New admin details</h1>
      {error && <Banner tone="error">{error}</Banner>}
      <form onSubmit={handleSubmit}>
        <Field label="Name" htmlFor="new-admin-name">
          <TextInput id="new-admin-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Contact email" htmlFor="new-admin-email">
          <TextInput id="new-admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Choose a username" htmlFor="new-admin-username">
          <TextInput id="new-admin-username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        <Field label="Set a password" htmlFor="new-admin-password">
          <TextInput
            id="new-admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Confirm password" htmlFor="new-admin-password-confirm">
          <TextInput
            id="new-admin-password-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>
        {password && password.length < MIN_PASSWORD_LENGTH && (
          <p className="text-xs text-berry-600 mb-3">Password must be at least {MIN_PASSWORD_LENGTH} characters.</p>
        )}
        {confirmPassword && password !== confirmPassword && (
          <p className="text-xs text-berry-600 mb-3">Passwords don't match.</p>
        )}
        <Field label="Role" htmlFor="new-admin-role">
          <Select id="new-admin-role" value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
            <option value="volunteer">Volunteer</option>
            <option value="administrator">Administrator</option>
          </Select>
        </Field>
        <Button type="submit" disabled={loading || !canSubmit} className="w-full">
          {loading ? 'Registering…' : 'Register'}
        </Button>
      </form>
    </Card>
  )
}
