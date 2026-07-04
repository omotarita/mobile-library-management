import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../../lib/auth'
import { generateUniqueBookCode } from '../../lib/book-code-generator'
import { supabase } from '../../lib/supabase'
import type { Book } from '../../types'
import { Banner, Button, Card, Field, TextInput } from '../ui'

const AGE_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 11]

export default function BookForm({ book, onDone, onCancel }: { book?: Book; onDone: () => void; onCancel: () => void }) {
  const { staff } = useAuth()
  const isEdit = !!book
  const [title, setTitle] = useState(book?.title ?? '')
  const [author, setAuthor] = useState(book?.author ?? '')
  const [minAge, setMinAge] = useState(String(book?.min_age ?? 4))
  const [maxAge, setMaxAge] = useState(String(book?.max_age ?? 11))
  const [donor, setDonor] = useState(book?.donor ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [createdCode, setCreatedCode] = useState<string | null>(null)

  const canSubmit = title.trim() && author.trim() && Number(minAge) <= Number(maxAge)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!canSubmit) return
    setSaving(true)
    try {
      const details = {
        title: title.trim(),
        author: author.trim(),
        min_age: Number(minAge),
        max_age: Number(maxAge),
        donor: donor.trim() || null,
      }

      if (isEdit) {
        const { error: updateError } = await supabase.from('books').update(details).eq('id', book.id)
        if (updateError) throw updateError
        await supabase.from('audit_log').insert({
          admin_id: staff?.id,
          action: 'EDIT_BOOK',
          target_type: 'book',
          target_id: book.id,
          details,
        })
        onDone()
      } else {
        const uniqueCode = await generateUniqueBookCode()
        const { data: inserted, error: insertError } = await supabase
          .from('books')
          .insert({ ...details, unique_code: uniqueCode, added_by: staff?.id })
          .select()
          .single()
        if (insertError) throw insertError
        await supabase.from('audit_log').insert({
          admin_id: staff?.id,
          action: 'ADD_BOOK',
          target_type: 'book',
          target_id: inserted.id,
          details: { ...details, unique_code: uniqueCode },
        })
        setCreatedCode(uniqueCode)
      }
    } catch {
      setError('Something went wrong saving this book. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (createdCode) {
    return (
      <Card className="max-w-lg mx-auto text-center">
        <div className="text-5xl mb-4" aria-hidden="true">🏷️</div>
        <h1 className="text-xl font-bold mb-2">Book added!</h1>
        <p className="text-ink/60 mb-4 text-sm">
          Write this code on a sticker and place it on the book — it's how volunteers will look
          the book up when it's borrowed or returned.
        </p>
        <p className="font-mono text-3xl font-bold tracking-wider text-coral-600 bg-coral-50 rounded-xl py-4 mb-6">
          {createdCode}
        </p>
        <Button onClick={onDone} className="w-full">
          Done
        </Button>
      </Card>
    )
  }

  return (
    <Card className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">{isEdit ? 'Edit book' : 'Add a new book'}</h1>
      {error && <Banner tone="error">{error}</Banner>}
      {isEdit && (
        <Field label="Unique code (sticker)" htmlFor="book-code">
          <TextInput id="book-code" value={book.unique_code} disabled className="opacity-70" />
        </Field>
      )}
      <form onSubmit={handleSubmit}>
        <Field label="Title" htmlFor="book-title">
          <TextInput id="book-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        <Field label="Author" htmlFor="book-author">
          <TextInput id="book-author" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Min age" htmlFor="book-min-age">
            <select
              id="book-min-age"
              className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-400 min-h-12"
              value={minAge}
              onChange={(e) => setMinAge(e.target.value)}
            >
              {AGE_OPTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </Field>
          <Field label="Max age" htmlFor="book-max-age">
            <select
              id="book-max-age"
              className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-400 min-h-12"
              value={maxAge}
              onChange={(e) => setMaxAge(e.target.value)}
            >
              {AGE_OPTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Donor (optional)" htmlFor="book-donor">
          <TextInput id="book-donor" value={donor} onChange={(e) => setDonor(e.target.value)} />
        </Field>
        <div className="flex gap-3">
          <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit || saving} className="flex-1">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add book'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
