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

  const open     = tickets?.filter(t => t.status === 'open').length ?? 0
  const urgent   = tickets?.filter(t => t.priority === 'urgent' && t.status === 'open').length ?? 0
  const quoted   = tickets?.filter(t => t.status === 'quoted').length ?? 0
  const active   = tickets?.filter(t => t.status === 'in_progress').length ?? 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Open',       value: open,   icon: List,         color: 'text-blue-600 bg-blue-50' },
          { label: 'Urgent',     value: urgent, icon: AlertCircle,  color: 'text-red-600 bg-red-50' },
          { label: 'Quoted',     value: quoted, icon: Clock,        color: 'text-purple-600 bg-purple-50' },
          { label: 'In Progress',value: active, icon: CheckCircle,  color: 'text-yellow-600 bg-yellow-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={`p-2 rounded-full ${stat.color}`}>
              <stat.icon size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent tickets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Recent Tickets</h2>
          <Link href="/admin/tickets" className="text-sm text-brand-600 hover:underline">View all</Link>
        </div>

        <div className="space-y-2">
          {(tickets?.slice(0, 8) as (Ticket & { profiles: any })[])?.map(ticket => (
            <Link key={ticket.id} href={`/admin/tickets/${ticket.id}`}>
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-brand-300 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{ticket.title}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {ticket.profiles?.company_name} — {ticket.profiles?.sub_store} · {ticket.profiles?.full_name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(ticket.created_at)}</p>
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
