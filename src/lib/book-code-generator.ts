import { supabase } from './supabase'

function randomCode(): string {
  // e.g. "E1800EDE-EB" — short, printable on a small sticker, unlikely to
  // collide even without checking (40 bits of randomness), but we verify
  // uniqueness anyway since it's cheap.
  const hex = crypto.randomUUID().replace(/-/g, '').toUpperCase()
  return `${hex.slice(0, 8)}-${hex.slice(8, 10)}`
}

async function isCodeTaken(code: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('books')
    .select('id')
    .ilike('unique_code', code)
    .limit(1)

  if (error) throw error
  return (data?.length ?? 0) > 0
}

/** Generates a unique physical-sticker code for a new book. */
export async function generateUniqueBookCode(): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = randomCode()
    if (!(await isCodeTaken(candidate))) {
      return candidate
    }
  }
  throw new Error('Could not generate a unique book code. Please try again.')
}
