import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import type { Book, BookStatus } from '../../types'
import { Banner, Button, ConfirmDialog, Spinner, TextInput } from '../ui'
import AdminNav from './AdminNav'
import BookForm from './BookForm'

const STATUS_LABELS: Record<BookStatus, string> = {
  available: 'Available',
  borrowed: 'Borrowed',
  lost: 'Lost',
  damaged: 'Damaged',
}

const STATUS_STYLES: Record<BookStatus, string> = {
  available: 'bg-teal-100 text-teal-600',
  borrowed: 'bg-sun-100 text-ink',
  lost: 'bg-berry-500/15 text-berry-600',
  damaged: 'bg-berry-500/15 text-berry-600',
}

export default function BooksTable() {
  const { staff } = useAuth()
  const isAdministrator = staff?.role === 'administrator'
  const [books, setBooks] = useState<Book[] | null>(null)
  const [borrowerByBookId, setBorrowerByBookId] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<BookStatus | 'all'>('all')
  const [formMode, setFormMode] = useState<'closed' | 'new' | Book>('closed')
  const [error, setError] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<{ book: Book; status: 'lost' | 'damaged' } | null>(null)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    const { data: bookRows, error: bookError } = await supabase
      .from('books')
      .select('*')
      .order('added_at', { ascending: false })
    if (bookError) {
      setError('Could not load books.')
      return
    }
    setBooks(bookRows as Book[])

    const { data: activeBorrows } = await supabase
      .from('borrow_records')
      .select('book_id, member:members(username)')
      .is('returned_at', null)

    const map: Record<string, string> = {}
    for (const row of (activeBorrows as unknown as { book_id: string; member: { username: string } | null }[]) ?? []) {
      if (row.member) map[row.book_id] = row.member.username
    }
    setBorrowerByBookId(map)
  }

  async function markStatus(book: Book, status: 'lost' | 'damaged' | 'available') {
    const { error: updateError } = await supabase.from('books').update({ status }).eq('id', book.id)
    if (updateError) {
      setError('Could not update this book. Please try again.')
      return
    }

    // If this book was out on loan, close that loan out too — otherwise it
    // stays "borrowed" against the member forever, even though the book has
    // been pulled from circulation.
    if (status === 'lost' || status === 'damaged') {
      await supabase
        .from('borrow_records')
        .update({ returned_at: new Date().toISOString(), returned_by: staff?.id })
        .eq('book_id', book.id)
        .is('returned_at', null)
    }

    const action = status === 'lost' ? 'MARK_LOST' : status === 'damaged' ? 'MARK_DAMAGED' : 'RESTORE_BOOK'
    await supabase.from('audit_log').insert({
      admin_id: staff?.id,
      action,
      target_type: 'book',
      target_id: book.id,
      details: { unique_code: book.unique_code, title: book.title },
    })
    void load()
  }

  function confirmMarkStatus() {
    if (!confirmTarget) return
    void markStatus(confirmTarget.book, confirmTarget.status)
    setConfirmTarget(null)
  }

  const filtered = useMemo(() => {
    if (!books) return []
    const q = search.trim().toLowerCase()
    return books.filter((b) => {
      const matchesSearch =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.unique_code.toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [books, search, statusFilter])

  if (formMode !== 'closed') {
    return (
      <div>
        <AdminNav active="adminBooks" />
        <BookForm
          book={formMode === 'new' ? undefined : formMode}
          onDone={() => {
            setFormMode('closed')
            void load()
          }}
          onCancel={() => setFormMode('closed')}
        />
      </div>
    )
  }

  return (
    <div>
      <AdminNav active="adminBooks" />
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold flex-1">Books ({books?.length ?? 0})</h1>
        {isAdministrator && <Button onClick={() => setFormMode('new')}>+ Add book</Button>}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <TextInput
          placeholder="Search by title, author, or code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-[40rem] border-2! border-ink/40!"
        />
        <select
          className="rounded-xl border border-ink/15 bg-white px-4 py-3 text-base min-h-12"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as BookStatus | 'all')}
        >
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {error && <Banner tone="error">{error}</Banner>}

      {!books ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-cream-dark text-left text-ink/70">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Author</th>
                <th className="px-4 py-3">Ages</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Borrower</th>
                <th className="px-4 py-3">Donor</th>
                {isAdministrator && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((book) => (
                <tr key={book.id} className="border-t border-black/5">
                  <td className="px-4 py-3 font-mono text-xs">{book.unique_code}</td>
                  <td className="px-4 py-3">{book.title}</td>
                  <td className="px-4 py-3">{book.author}</td>
                  <td className="px-4 py-3">{book.min_age}-{book.max_age}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[book.status]}`}>
                      {STATUS_LABELS[book.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">{borrowerByBookId[book.id] ?? '—'}</td>
                  <td className="px-4 py-3">{book.donor ?? '—'}</td>
                  {isAdministrator && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setFormMode(book)}
                          className="text-teal-600 font-semibold hover:underline"
                        >
                          Edit
                        </button>
                        {book.status !== 'lost' && book.status !== 'damaged' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setConfirmTarget({ book, status: 'lost' })}
                              className="text-berry-600 font-semibold hover:underline"
                            >
                              Mark lost
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmTarget({ book, status: 'damaged' })}
                              className="text-berry-600 font-semibold hover:underline"
                            >
                              Mark damaged
                            </button>
                          </>
                        )}
                        {(book.status === 'lost' || book.status === 'damaged') && (
                          <button
                            type="button"
                            onClick={() => markStatus(book, 'available')}
                            className="text-teal-600 font-semibold hover:underline"
                          >
                            Restore to available
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdministrator ? 8 : 7} className="px-4 py-6 text-center text-ink/50">
                    No books match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {confirmTarget && (
        <ConfirmDialog
          title={`Mark "${confirmTarget.book.title}" as ${confirmTarget.status}?`}
          message={
            confirmTarget.book.status === 'borrowed'
              ? "This removes it from circulation, closes out the current borrower's loan, and stops overdue reminders for it. You can restore it to available again later if this was a mistake."
              : 'This removes it from circulation and stops overdue reminders for it. You can restore it to available again later if this was a mistake.'
          }
          confirmLabel={confirmTarget.status === 'lost' ? 'Mark lost' : 'Mark damaged'}
          onConfirm={confirmMarkStatus}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  )
}
