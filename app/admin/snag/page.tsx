import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { AlertTriangle } from 'lucide-react'
import {
  STATUS_COLORS, STATUS_LABELS,
  PRIORITY_COLORS, PRIORITY_LABELS,
  formatDate,
} from '@/lib/utils'
import type { Ticket } from '@/lib/types'

export default async function AdminSnagPage() {
  const db = createAdminClient()

  const { data: tickets } = await db
    .from('tickets')
    .select('*, profiles(full_name, company_name, sub_store), completions(id, status, reject_reason, created_at)')
    .eq('status', 'snag')
    .order('updated_at', { ascending: false })

  const snagTickets = (tickets ?? []) as any[]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <AlertTriangle size={20} className="text-rose-500" /> Snag Tickets
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Tickets where the regional manager rejected the COC/POC — re-upload required.
        </p>
      </div>

      {snagTickets.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center">
          <AlertTriangle size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No snag tickets — all sign-offs are clear.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {snagTickets.map((ticket: any) => {
            const latestCompletion = (ticket.completions ?? [])
              .filter((c: any) => c.status === 'rejected')
              .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
            return (
              <Link key={ticket.id} href={`/admin/tickets/${ticket.id}`}>
                <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/40 rounded-xl px-4 py-3 hover:border-rose-400 dark:hover:border-rose-600 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{ticket.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {ticket.profiles?.company_name} — {ticket.profiles?.sub_store}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(ticket.updated_at)}</p>
                      {latestCompletion?.reject_reason && (
                        <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium">
                          Rejection: {latestCompletion.reject_reason}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-end shrink-0">
                      <Badge className={PRIORITY_COLORS[ticket.priority as keyof typeof PRIORITY_COLORS]}>
                        {PRIORITY_LABELS[ticket.priority as keyof typeof PRIORITY_LABELS]}
                      </Badge>
                      <Badge className={STATUS_COLORS[ticket.status as keyof typeof STATUS_COLORS]}>
                        {STATUS_LABELS[ticket.status as keyof typeof STATUS_LABELS]}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
