import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import {
  STATUS_COLORS, STATUS_LABELS,
  PRIORITY_COLORS, PRIORITY_LABELS,
  formatDate,
} from '@/lib/utils'
import type { Ticket } from '@/lib/types'
import { AlertCircle, Clock, CheckCircle, List } from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = createClient()

  const { data: tickets } = await supabase
    .from('tickets')
    .select('*, profiles(full_name, company_name, sub_store)')
    .order('created_at', { ascending: false })

  const total    = tickets?.length ?? 0
  const open     = tickets?.filter(t => t.status === 'open').length ?? 0
  const urgent   = tickets?.filter(t => t.priority === 'urgent' && t.status === 'open').length ?? 0
  const quoted   = tickets?.filter(t => t.status === 'quoted').length ?? 0
  const active   = tickets?.filter(t => t.status === 'in_progress').length ?? 0
  const completed = tickets?.filter(t => t.status === 'completed').length ?? 0
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0
  const openActivePct = total > 0 ? Math.round(((open + active + quoted) / total) * 100) : 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Open',       value: open,   icon: List,         color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
          { label: 'Urgent',     value: urgent, icon: AlertCircle,  color: 'text-red-600 bg-red-50 dark:bg-red-900/30' },
          { label: 'Quoted',     value: quoted, icon: Clock,        color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30' },
          { label: 'In Progress',value: active, icon: CheckCircle,  color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30' },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
            <div className={`p-2 rounded-full ${stat.color}`}>
              <stat.icon size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold dark:text-white">{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Completion bar */}
      {total > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-200">Ticket Completion</span>
            <span className="text-gray-500 dark:text-gray-400">{completed} of {total} completed</span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
            <div className="h-full bg-green-500 transition-all" style={{ width: `${completionPct}%` }} title={`${completionPct}% completed`} />
            <div className="h-full bg-blue-400 transition-all" style={{ width: `${openActivePct}%` }} title={`${openActivePct}% open/active`} />
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />{completionPct}% Completed</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />{openActivePct}% Open / Active</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-gray-600 inline-block" />{100 - completionPct - openActivePct}% Other</span>
          </div>
        </div>
      )}

      {/* Recent tickets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">Recent Tickets</h2>
          <Link href="/admin/tickets" className="text-sm text-brand-600 hover:underline">View all</Link>
        </div>

        <div className="space-y-2">
          {(tickets?.slice(0, 8) as (Ticket & { profiles: any })[])?.map(ticket => (
            <Link key={ticket.id} href={`/admin/tickets/${ticket.id}`}>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 hover:border-brand-300 dark:hover:border-brand-600 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{ticket.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {ticket.profiles?.company_name} — {ticket.profiles?.sub_store} · {ticket.profiles?.full_name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(ticket.created_at)}</p>
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
          ))}
        </div>
      </div>
    </div>
  )
}
