import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import {
  STATUS_COLORS, STATUS_LABELS,
  PRIORITY_COLORS, PRIORITY_LABELS,
  formatDate,
} from '@/lib/utils'
import type { Ticket } from '@/lib/types'

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: { status?: string; priority?: string }
}) {
  const supabase = createClient()

  let query = supabase
    .from('tickets')
    .select('*, profiles(full_name, company_name, sub_store)')
    .order('created_at', { ascending: false })

  if (searchParams.status)   query = query.eq('status', searchParams.status)
  if (searchParams.priority) query = query.eq('priority', searchParams.priority)

  const { data: tickets } = await query

  const statuses = ['open', 'quoted', 'accepted', 'in_progress', 'completed', 'cancelled']
  const priorities = ['urgent', 'high', 'medium', 'low']

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">All Tickets</h1>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href="/admin/tickets"
          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
            !searchParams.status && !searchParams.priority
              ? 'bg-brand-600 text-white border-brand-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
          }`}
        >
          All
        </Link>
        {statuses.map(s => (
          <Link
            key={s}
            href={`/admin/tickets?status=${s}`}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              searchParams.status === s
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            {STATUS_LABELS[s as keyof typeof STATUS_LABELS]}
          </Link>
        ))}
      </div>

      {!tickets?.length ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
          <p className="text-sm text-gray-400">No tickets found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(tickets as (Ticket & { profiles: any })[]).map(ticket => (
            <Link key={ticket.id} href={`/admin/tickets/${ticket.id}`}>
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-4 hover:border-brand-300 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{ticket.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {ticket.profiles?.company_name} — {ticket.profiles?.sub_store}
                    </p>
                    <p className="text-xs text-gray-500">{ticket.profiles?.full_name}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(ticket.created_at)}</p>
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
      )}
    </div>
  )
}
