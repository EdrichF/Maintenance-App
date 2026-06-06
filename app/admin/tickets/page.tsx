import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { CollapsibleArchive } from '@/components/ui/CollapsibleArchive'
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
  const db = createAdminClient()

  let query = db
    .from('tickets')
    .select('*, profiles(full_name, company_name, sub_store)')
    .order('created_at', { ascending: false })

  if (searchParams.status)   query = query.eq('status', searchParams.status)
  if (searchParams.priority) query = query.eq('priority', searchParams.priority)

  const { data: tickets } = await query

  const activeStatuses = ['open', 'quoted', 'accepted', 'in_progress', 'declined']
  const filterStatuses = ['open', 'quoted', 'accepted', 'in_progress', 'completed', 'cancelled', 'declined']

  const noFilter = !searchParams.status && !searchParams.priority
  const active   = noFilter ? (tickets ?? []).filter((t: any) => activeStatuses.includes(t.status))        : (tickets ?? [])
  const archived = noFilter ? (tickets ?? []).filter((t: any) => ['completed','cancelled'].includes(t.status)) : []

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">All Tickets</h1>

      <div className="flex gap-2 flex-wrap">
        <Link href="/admin/tickets"
          className={`px-3 py-1 rounded-full text-sm border transition-colors ${noFilter
            ? 'bg-brand-600 text-white border-brand-600'
            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}>
          All
        </Link>
        {filterStatuses.map(s => (
          <Link key={s} href={`/admin/tickets?status=${s}`}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${searchParams.status === s
              ? 'bg-brand-600 text-white border-brand-600'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}>
            {STATUS_LABELS[s as keyof typeof STATUS_LABELS]}
          </Link>
        ))}
      </div>

      {active.length === 0 && archived.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-10 text-center">
          <p className="text-sm text-gray-400">No tickets found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(active as (Ticket & { profiles: any })[]).map(ticket => (
            <Link key={ticket.id} href={`/admin/tickets/${ticket.id}`}>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 hover:border-brand-300 dark:hover:border-brand-600 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{ticket.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {ticket.profiles?.company_name} — {ticket.profiles?.sub_store} · {ticket.profiles?.full_name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDate(ticket.created_at)}</p>
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

          <CollapsibleArchive count={archived.length}>
            {(archived as (Ticket & { profiles: any })[]).map(ticket => (
              <Link key={ticket.id} href={`/admin/tickets/${ticket.id}`}>
                <div className="px-4 py-3 opacity-75 hover:opacity-100 transition-opacity hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-700 dark:text-gray-300 truncate">{ticket.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {ticket.profiles?.company_name} — {ticket.profiles?.sub_store} · {formatDate(ticket.updated_at)}
                      </p>
                    </div>
                    <Badge className={STATUS_COLORS[ticket.status as keyof typeof STATUS_COLORS]}>
                      {STATUS_LABELS[ticket.status as keyof typeof STATUS_LABELS]}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </CollapsibleArchive>
        </div>
      )}
    </div>
  )
}
