import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { sendReturnConfirmationEmail } from '../lib/email'
import { formatDate } from '../lib/format'
import { supabase } from '../lib/supabase'
import { useRouter } from '../router'
import type { BorrowRecordWithBook, Member } from '../types'
import { Banner, Button, Card, Field, Select, Spinner } from './ui'

export default function ReturnFlow({ member }: { member: Member }) {
  const { staff } = useAuth()
  const { navigate } = useRouter()
  const [totalBorrowed, setTotalBorrowed] = useState(0)
  const [active, setActive] = useState<BorrowRecordWithBook[] | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void loadStats()
  }, [])

  async function loadStats() {
    const { count } = await supabase
      .from('borrow_records')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', member.id)

    const { data } = await supabase
      .from('borrow_records')
      .select('*, book:books(*)')
      .eq('member_id', member.id)
      .is('returned_at', null)

    setTotalBorrowed(count ?? 0)
    const records = (data as BorrowRecordWithBook[]) ?? []
    setActive(records)
    if (records.length > 0) setSelectedId(records[0].id)
  }

  if (!active) return <Spinner />

  async function handleReturn(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!selectedId || !staff || !active) return
    const record = active.find((r) => r.id === selectedId)
    if (!record) return

    setSubmitting(true)
    try {
      const { error: rpcError } = await supabase.rpc('return_book', {
        p_borrow_record_id: selectedId,
        p_admin_id: staff.id,
      })
      if (rpcError) throw rpcError

      await sendReturnConfirmationEmail({
        trustedAdultEmail: member.trusted_adult_email,
        memberName: member.name,
        memberUsername: member.username,
        bookTitle: record.book.title,
        bookAuthor: record.book.author,
      })

      navigate({ name: 'returnConfirm', bookTitle: record.book.title, bookAuthor: record.book.author })
    } catch {
      setError('Something went wrong processing this return. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold">Welcome back, {member.name}</h1>
      <p className="text-xs text-ink/40 mb-3">Username: {member.username}</p>
      <p className="text-ink/60 mb-6 text-sm">
        {totalBorrowed} book{totalBorrowed === 1 ? '' : 's'} borrowed to date
      </p>

      {error && <Banner tone="error">{error}</Banner>}

      {active.length === 0 ? (
        <Banner tone="info">You don't have any books to return.</Banner>
      ) : (
        <form onSubmit={handleReturn}>
          <Field label="Which book are you returning?" htmlFor="return-select">
            <Select id="return-select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {active.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.book.title} (due {formatDate(r.due_date)})
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Returning…' : 'Return this book'}
          </Button>
        </form>
      )}
    </Card>
  )
}
