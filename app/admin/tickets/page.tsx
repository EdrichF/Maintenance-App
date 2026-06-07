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
    .select('*, profiles(full_name, company_name, sub_store), quotes(id, created_at, status)')
    .order('created_at', { ascending: false })

  if (searchParams.status)   query = query.eq('status', searchParams.status)
  if (searchParams.priority) query = query.eq('priority', searchParams.priority)

  const { data: tickets } = await query

  const activeStatuses = ['open', 'quoted', 'accepted', 'in_progress', 'pending_sign_off', 'snag', 'snag_in_progress', 'declined']
  const filterStatuses = ['open', 'quoted', 'accepted', 'in_progress', 'pending_sign_off', 'snag', 'snag_in_progress', 'completed', 'declined']

  const noFilter = !searchParams.status && !searchParams.priority
  const active   = noFilter ? (tickets ?? []).filter((t: any) => activeStatuses.includes(t.status))        : (tickets ?? [])
  const archived = noFilter ? (tickets ?? []).filter((t: any) => ['completed','cancelled'].includes(t.status)) : []


  const statusCounts = {
    open:        (tickets ?? []).filter((t: any) => t.status === 'open').length,
    quoted:      (tickets ?? []).filter((t: any) => t.status === 'quoted').length,
    accepted:    (tickets ?? []).filter((t: any) => t.status === 'accepted').length,
    in_progress: (tickets ?? []).filter((t: any) => t.status === 'in_progress').length,
    pending_sign_off: (tickets ?? []).filter((t: any) => t.status === 'pending_sign_off').length,
    snag:             (tickets ?? []).filter((t: any) => t.status === 'snag').length,
    snag_in_progress: (tickets ?? []).filter((t: any) => t.status === 'snag_in_progress').length,
    completed:        (tickets ?? []).filter((t: any) => t.status === 'completed').length,
    declined:         (tickets ?? []).filter((t: any) => t.status === 'declined').length,
    cancelled:        (tickets ?? []).filter((t: any) => t.status === 'cancelled').length,
  }
  const totalCount = (tickets ?? []).length

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

      {/* Ticket status breakdown bar */}
      {totalCount > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-200">Ticket Status Breakdown</span>
            <span className="text-gray-500 dark:text-gray-400">{totalCount} ticket{totalCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex gap-px">
            {statusCounts.open > 0 && <div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.round((statusCounts.open/totalCount)*100)}%` }} />}
            {statusCounts.quoted > 0 && <div className="h-full bg-purple-500 transition-all" style={{ width: `${Math.round((statusCounts.quoted/totalCount)*100)}%` }} />}
            {statusCounts.accepted > 0 && <div className="h-full bg-teal-500 transition-all" style={{ width: `${Math.round((statusCounts.accepted/totalCount)*100)}%` }} />}
            {statusCounts.in_progress > 0 && <div className="h-full bg-amber-500 transition-all" style={{ width: `${Math.round((statusCounts.in_progress/totalCount)*100)}%` }} />}
            {statusCounts.pending_sign_off > 0 && <div className="h-full bg-orange-400 transition-all" style={{ width: `${Math.round((statusCounts.pending_sign_off/totalCount)*100)}%` }} />}
            {statusCounts.snag > 0 && <div className="h-full bg-amber-500 transition-all" style={{ width: `${Math.round((statusCounts.snag/totalCount)*100)}%` }} />}
            {statusCounts.completed > 0 && <div className="h-full bg-green-500 transition-all" style={{ width: `${Math.round((statusCounts.completed/totalCount)*100)}%` }} />}
            {statusCounts.declined > 0 && <div className="h-full bg-red-500 transition-all" style={{ width: `${Math.round((statusCounts.declined/totalCount)*100)}%` }} />}
            {statusCounts.cancelled > 0 && <div className="h-full bg-gray-400 transition-all" style={{ width: `${Math.round((statusCounts.cancelled/totalCount)*100)}%` }} />}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
            {statusCounts.open > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Open ({statusCounts.open})</span>}
            {statusCounts.quoted > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />Quoted ({statusCounts.quoted})</span>}
            {statusCounts.accepted > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />Accepted ({statusCounts.accepted})</span>}
            {statusCounts.in_progress > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />In Progress ({statusCounts.in_progress})</span>}
            {statusCounts.pending_sign_off > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />Pending Sign-off ({statusCounts.pending_sign_off})</span>}
            {statusCounts.snag > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Snag ({statusCounts.snag})</span>}
            {statusCounts.completed > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Completed ({statusCounts.completed})</span>}
            {statusCounts.declined > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Declined ({statusCounts.declined})</span>}
            {statusCounts.cancelled > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />Cancelled ({statusCounts.cancelled})</span>}
          </div>
        </div>
      )}

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
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Created: {formatDate(ticket.created_at)}
                      {(() => { const qs = (ticket as any).quotes ?? []; const latest = qs.filter((q:any)=>q.status!=='declined').sort((a:any,b:any)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime())[0]; return latest ? <span className="ml-2 text-purple-500 dark:text-purple-400">· Quoted: {formatDate(latest.created_at)}</span> : null })()}
                    </p>
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
