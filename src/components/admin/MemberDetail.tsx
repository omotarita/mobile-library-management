import { useEffect, useState } from 'react'
import { formatDate } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import type { BorrowRecordWithBook, Member } from '../../types'
import { Card, Spinner } from '../ui'
import AdminNav from './AdminNav'

export default function MemberDetail({ memberId }: { memberId: string }) {
  const [member, setMember] = useState<Member | null>(null)
  const [history, setHistory] = useState<BorrowRecordWithBook[] | null>(null)

  useEffect(() => {
    void load()
  }, [memberId])

  async function load() {
    const { data: memberRow } = await supabase.from('members').select('*').eq('id', memberId).single()
    setMember(memberRow as Member)

    const { data: historyRows } = await supabase
      .from('borrow_records')
      .select('*, book:books(*)')
      .eq('member_id', memberId)
      .order('borrowed_at', { ascending: false })
    setHistory((historyRows as BorrowRecordWithBook[]) ?? [])
  }

  if (!member || !history) return <Spinner />

  return (
    <div>
      <AdminNav active="adminMembers" />

      <Card className="mb-6">
        <h1 className="text-2xl font-bold text-coral-600">{member.username}</h1>
        <p className="text-ink/60 mb-4">{member.name}</p>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-ink/50">Age</dt><dd className="font-semibold">{member.age}</dd></div>
          <div><dt className="text-ink/50">School</dt><dd className="font-semibold">{member.school}</dd></div>
          <div><dt className="text-ink/50">Member since</dt><dd className="font-semibold">{formatDate(member.created_at)}</dd></div>
          <div><dt className="text-ink/50">Trusted adult</dt><dd className="font-semibold">{member.trusted_adult_name}</dd></div>
          <div><dt className="text-ink/50">Trusted adult email</dt><dd className="font-semibold">{member.trusted_adult_email}</dd></div>
        </dl>
      </Card>

      <h2 className="text-lg font-bold mb-3">Borrow history</h2>
      {history.length === 0 ? (
        <p className="text-ink/50 text-sm">No books borrowed yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-cream-dark text-left text-ink/70">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Borrowed</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Returned</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record) => {
                const isOverdue = !record.returned_at && new Date(record.due_date) < new Date()
                return (
                  <tr key={record.id} className="border-t border-black/5">
                    <td className="px-4 py-3">{record.book.title}</td>
                    <td className="px-4 py-3">{formatDate(record.borrowed_at)}</td>
                    <td className="px-4 py-3">{formatDate(record.due_date)}</td>
                    <td className="px-4 py-3">{record.returned_at ? formatDate(record.returned_at) : '—'}</td>
                    <td className="px-4 py-3">
                      {record.returned_at ? (
                        <span className="text-teal-600 font-semibold">Returned</span>
                      ) : isOverdue ? (
                        <span className="text-berry-600 font-semibold">Overdue</span>
                      ) : (
                        <span className="text-sun-500 font-semibold">Out</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
