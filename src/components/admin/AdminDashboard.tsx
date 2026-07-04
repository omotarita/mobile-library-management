import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { Card, Spinner } from '../ui'
import AdminNav from './AdminNav'

export default function AdminDashboard() {
  const { staff } = useAuth()
  const [borrowedCount, setBorrowedCount] = useState<number | null>(null)
  const [overdueCount, setOverdueCount] = useState<number | null>(null)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    const { count: borrowed } = await supabase
      .from('books')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'borrowed')

    const { count: overdue } = await supabase
      .from('borrow_records')
      .select('id', { count: 'exact', head: true })
      .is('returned_at', null)
      .lt('due_date', new Date().toISOString())

    setBorrowedCount(borrowed ?? 0)
    setOverdueCount(overdue ?? 0)
  }

  return (
    <div>
      <AdminNav active="adminDashboard" />
      <h1 className="text-2xl font-bold mb-1">Welcome back, {staff?.name}</h1>
      <p className="text-ink/60 mb-6 text-sm capitalize">{staff?.role}</p>

      {borrowedCount === null || overdueCount === null ? (
        <Spinner />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="text-center">
            <p className="text-4xl font-extrabold text-teal-600">{borrowedCount}</p>
            <p className="text-ink/60 text-sm mt-1">books currently borrowed</p>
          </Card>
          <Card className="text-center">
            <p className={`text-4xl font-extrabold ${overdueCount > 0 ? 'text-berry-600' : 'text-teal-600'}`}>
              {overdueCount}
            </p>
            <p className="text-ink/60 text-sm mt-1">overdue books</p>
          </Card>
        </div>
      )}
    </div>
  )
}
