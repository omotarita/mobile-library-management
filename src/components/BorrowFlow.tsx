import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { sendBorrowConfirmationEmail } from '../lib/email'
import { formatDate } from '../lib/format'
import { supabase } from '../lib/supabase'
import { useRouter } from '../router'
import type { Book, BorrowRecordWithBook, Member } from '../types'
import { Banner, Button, Card, Field, Spinner, TextInput } from './ui'

interface Stats {
  totalBorrowed: number
  active: BorrowRecordWithBook[]
}

const RPC_ERROR_MESSAGES: Record<string, string> = {
  MEMBER_NOT_FOUND: 'This member could not be found. Please try again.',
  BOOK_NOT_FOUND: "We couldn't find a book with that code. Please check and try again.",
  BOOK_UNAVAILABLE: 'That book just became unavailable — someone may have borrowed it. Try another book.',
  AGE_NOT_APPROPRIATE: "That book isn't age-appropriate for this member. Try another book.",
  MAX_BOOKS_REACHED: 'This member already has the maximum number of books borrowed.',
  OVERDUE_BLOCK: 'This member has overdue books. Please return them first.',
}

export default function BorrowFlow({ member }: { member: Member }) {
  const { staff } = useAuth()
  const { navigate } = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [overrideEnabled, setOverrideEnabled] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [helpNotice, setHelpNotice] = useState(false)

  useEffect(() => {
    void loadStats()
  }, [])

  async function loadStats() {
    setLoadingStats(true)
    const { count } = await supabase
      .from('borrow_records')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', member.id)

    const { data: active } = await supabase
      .from('borrow_records')
      .select('*, book:books(*)')
      .eq('member_id', member.id)
      .is('returned_at', null)

    setStats({
      totalBorrowed: count ?? 0,
      active: (active as BorrowRecordWithBook[]) ?? [],
    })
    setLoadingStats(false)
  }

  if (loadingStats || !stats) return <Spinner />

  const maxBooksReached = stats.active.length >= 2
  const overdueRecords = stats.active.filter((r) => new Date(r.due_date) < new Date())
  const isOverdueBlocked = overdueRecords.length > 0 && !overrideEnabled

  async function handleBorrow(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmedCode = code.trim()
    if (!trimmedCode || !staff) return
    setSubmitting(true)
    try {
      // Pre-check so we can surface a friendly, title-specific message.
      // The RPC re-validates everything atomically right before writing,
      // so this pre-check is purely for UX and cannot be relied on alone.
      const { data: book } = await supabase
        .from('books')
        .select('*')
        .ilike('unique_code', trimmedCode)
        .maybeSingle<Book>()

      if (!book) {
        setError(RPC_ERROR_MESSAGES.BOOK_NOT_FOUND)
        return
      }
      if (book.status !== 'available') {
        setError(RPC_ERROR_MESSAGES.BOOK_UNAVAILABLE)
        return
      }
      if (member.age < book.min_age || member.age > book.max_age) {
        setError(`"${book.title}" isn't age-appropriate for you. Try another book.`)
        return
      }

      const { data: record, error: rpcError } = await supabase.rpc('borrow_book', {
        p_unique_code: trimmedCode,
        p_member_id: member.id,
        p_admin_id: staff.id,
        p_override: overrideEnabled,
      })

      if (rpcError) {
        setError(RPC_ERROR_MESSAGES[rpcError.message] ?? 'Something went wrong. Please try again.')
        return
      }

      const dueDateIso = (record as { due_date: string }).due_date

      await sendBorrowConfirmationEmail({
        trustedAdultEmail: member.trusted_adult_email,
        memberName: member.name,
        memberUsername: member.username,
        bookTitle: book.title,
        bookAuthor: book.author,
        dueDateIso,
      })

      navigate({
        name: 'borrowConfirm',
        memberUsername: member.username,
        bookTitle: book.title,
        bookAuthor: book.author,
        dueDateIso,
        totalBorrowed: stats!.totalBorrowed + 1,
      })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-1">Welcome back, {member.username}</h1>
      <p className="text-ink/60 mb-4 text-sm">
        {stats.totalBorrowed} book{stats.totalBorrowed === 1 ? '' : 's'} borrowed to date
      </p>

      {stats.active.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-ink/70 mb-2">Currently checked out</h2>
          <ul className="space-y-2">
            {stats.active.map((r) => (
              <li key={r.id} className="rounded-xl bg-cream-dark px-4 py-2 text-sm flex justify-between">
                <span>{r.book.title}</span>
                <span className={new Date(r.due_date) < new Date() ? 'text-berry-600 font-semibold' : 'text-ink/60'}>
                  Due {formatDate(r.due_date)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <Banner tone="error">{error}</Banner>}

      {maxBooksReached ? (
        <Banner tone="warning">
          You already have the maximum number of books borrowed. Return a book before borrowing a
          new one.
        </Banner>
      ) : isOverdueBlocked ? (
        <>
          <Banner tone="warning">You have overdue books. Please return them first.</Banner>
          <Button variant="ghost" onClick={() => setOverrideEnabled(true)} className="w-full">
            Override and allow borrowing anyway
          </Button>
        </>
      ) : (
        <form onSubmit={handleBorrow}>
          <Field label="What book would you like to borrow?" htmlFor="book-code">
            <TextInput
              id="book-code"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Type the code on the book's sticker"
            />
          </Field>
          {overrideEnabled && (
            <p className="text-xs text-berry-600 mb-3">
              Borrow-block override is active for this transaction.
            </p>
          )}
          <Button type="submit" disabled={submitting || !code.trim()} className="w-full">
            {submitting ? 'Borrowing…' : 'Borrow this book'}
          </Button>
          <button
            type="button"
            onClick={() => setHelpNotice(true)}
            className="mt-4 w-full text-center text-sm text-teal-600 hover:underline"
          >
            Need help choosing a book? →
          </button>
          {helpNotice && (
            <p className="mt-2 text-center text-xs text-ink/50">Coming soon!</p>
          )}
        </form>
      )}
    </Card>
  )
}
