import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/auth'
import { formatDate } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { Banner, Spinner } from '../ui'
import AdminNav from './AdminNav'

interface AuditRow {
  id: string
  action: string
  target_type: string
  target_id: string | null
  details: Record<string, unknown> | null
  created_at: string
  admin: { name: string } | null
}

export default function AuditLog() {
  const { staff } = useAuth()
  const [rows, setRows] = useState<AuditRow[] | null>(null)

  useEffect(() => {
    if (staff?.role === 'administrator') void load()
  }, [staff])

  async function load() {
    const { data } = await supabase
      .from('audit_log')
      .select('*, admin:admins(name)')
      .order('created_at', { ascending: false })
      .limit(200)
    setRows((data as unknown as AuditRow[]) ?? [])
  }

  if (staff?.role !== 'administrator') {
    return (
      <div>
        <AdminNav active="adminAuditLog" />
        <Banner tone="error">Only administrators can view the audit log.</Banner>
      </div>
    )
  }

  return (
    <div>
      <AdminNav active="adminAuditLog" />
      <h1 className="text-2xl font-bold mb-4">Audit log</h1>

      {!rows ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-cream-dark text-left text-ink/70">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Who</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-black/5 align-top">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3">{row.admin?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold">{row.action}</td>
                  <td className="px-4 py-3">{row.target_type}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink/60">
                    {row.details ? JSON.stringify(row.details) : '—'}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-ink/50">
                    No activity yet.
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
