export type AdminRole = 'administrator' | 'volunteer'
export type AdminStatus = 'active' | 'inactive'

export interface Admin {
  id: string
  username: string
  name: string
  email: string | null
  role: AdminRole
  created_at: string
  last_login: string | null
  status: AdminStatus
}

export interface Member {
  id: string
  username: string
  name: string
  age: number
  school: string
  trusted_adult_name: string
  trusted_adult_email: string
  created_at: string
  registered_by: string | null
}

export type BookStatus = 'available' | 'borrowed' | 'lost' | 'damaged'

export interface Book {
  id: string
  unique_code: string
  title: string
  author: string
  min_age: number
  max_age: number
  donor: string | null
  status: BookStatus
  added_at: string
  added_by: string | null
}

export interface BorrowRecord {
  id: string
  book_id: string
  member_id: string
  borrowed_at: string
  due_date: string
  returned_at: string | null
  processed_by: string | null
  returned_by: string | null
  overdue_email_1_sent: boolean
  overdue_email_7_sent: boolean
  due_soon_email_sent: boolean
  override_used: boolean
}

export interface BorrowRecordWithBook extends BorrowRecord {
  book: Book
}

export type AuditAction =
  | 'BORROW'
  | 'RETURN'
  | 'REGISTER_MEMBER'
  | 'ADD_BOOK'
  | 'EDIT_BOOK'
  | 'MARK_LOST'
  | 'MARK_DAMAGED'
  | 'OVERRIDE_BORROW_BLOCK'
  | 'REGISTER_ADMIN'

export type AuditTargetType = 'book' | 'member' | 'admin'

export interface AuditLogEntry {
  id: string
  admin_id: string | null
  action: AuditAction
  target_type: AuditTargetType
  target_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}
