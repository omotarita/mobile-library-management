import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from '../../router'
import type { Member } from '../../types'
import { Spinner, TextInput } from '../ui'
import AdminNav from './AdminNav'

export default function MembersTable() {
  const { navigate } = useRouter()
  const [members, setMembers] = useState<Member[] | null>(null)
  const [activeCountByMember, setActiveCountByMember] = useState<Record<string, number>>({})
  const [totalCountByMember, setTotalCountByMember] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    const { data: memberRows } = await supabase.from('members').select('*').order('created_at', { ascending: false })
    setMembers((memberRows as Member[]) ?? [])

    const { data: allBorrows } = await supabase.from('borrow_records').select('member_id, returned_at')

    const activeCounts: Record<string, number> = {}
    const totalCounts: Record<string, number> = {}
    for (const row of (allBorrows as { member_id: string; returned_at: string | null }[]) ?? []) {
      totalCounts[row.member_id] = (totalCounts[row.member_id] ?? 0) + 1
      if (!row.returned_at) {
        activeCounts[row.member_id] = (activeCounts[row.member_id] ?? 0) + 1
      }
    }
    setActiveCountByMember(activeCounts)
    setTotalCountByMember(totalCounts)
  }

  const filtered = useMemo(() => {
    if (!members) return []
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) =>
        m.username.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.school.toLowerCase().includes(q)
    )
  }, [members, search])

  return (
    <div>
      <AdminNav active="adminMembers" />
      <h1 className="text-2xl font-bold mb-4">Members ({members?.length ?? 0})</h1>

      <TextInput
        placeholder="Search by username, name, or school"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-[40rem] mb-4 border-2! border-ink/40!"
      />

      {!members ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-cream-dark text-left text-ink/70">
              <tr>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Trusted adult</th>
                <th className="px-4 py-3">Total borrowed</th>
                <th className="px-4 py-3">Currently borrowing</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <tr
                  key={member.id}
                  onClick={() => navigate({ name: 'adminMemberDetail', memberId: member.id })}
                  className="border-t border-black/5 cursor-pointer hover:bg-cream-dark/60"
                >
                  <td className="px-4 py-3 font-semibold text-coral-600">{member.username}</td>
                  <td className="px-4 py-3">{member.name}</td>
                  <td className="px-4 py-3">{member.age}</td>
                  <td className="px-4 py-3">{member.school}</td>
                  <td className="px-4 py-3">
                    {member.trusted_adult_name}
                    <div className="text-xs text-ink/50">{member.trusted_adult_email}</div>
                  </td>
                  <td className="px-4 py-3">{totalCountByMember[member.id] ?? 0}</td>
                  <td className="px-4 py-3">{activeCountByMember[member.id] ?? 0}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-ink/50">
                    No members match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
