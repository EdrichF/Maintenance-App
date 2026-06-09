import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CollapsibleArchive } from '@/components/ui/CollapsibleArchive'
import {
  STATUS_COLORS, STATUS_LABELS,
  PRIORITY_COLORS, PRIORITY_LABELS,
  formatDateTime,
} from '@/lib/utils'
import type { Ticket } from '@/lib/types'

// Only these statuses are visible to store managers
const VISIBLE_STATUSES = ['open', 'in_progress', 'completed']

function TicketRow({ ticket }: { ticket: Ticket }) {
  return (
    <Link href={`/client/tickets/${ticket.id}`}>
      <div className="bg-slate-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4 hover:border-brand-300 dark:hover:border-brand-600 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white truncate">{ticket.title}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{ticket.description}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Created: {formatDateTime(ticket.created_at)}
            </p>
          </div>
          <div className="flex flex-col gap-1 items-end shrink-0">
            <Badge className={PRIORITY_COLORS[ticket.priority]}>
              {PRIORITY_LABELS[ticket.priority]}
            </Badge>
            <Badge className={STATUS_COLORS[ticket.status]}>
              {STATUS_LABELS[ticket.status]}
            </Badge>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default async function ClientTicketsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Only fetch the 3 visible statuses
  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('client_id', user!.id)
    .in('status', VISIBLE_STATUSES)
    .order('created_at', { ascending: false })

  const allTickets = tickets ?? []

  // Apply filter from URL param (must be one of the visible statuses)
  const activeFilter = searchParams.status && VISIBLE_STATUSES.includes(searchParams.status)
    ? searchParams.status
    : null

  const displayed = activeFilter
    ? allTickets.filter(t => t.status === activeFilter)
    : allTickets

  const active   = activeFilter ? displayed : displayed.filter(t => t.status !== 'completed')
  const archived = activeFilter ? []        : displayed.filter(t => t.status === 'completed')

  const counts = {
    open:        allTickets.filter(t => t.status === 'open').length,
    in_progress: allTickets.filter(t => t.status === 'in_progress').length,
    completed:   allTickets.filter(t => t.status === 'completed').length,
  }
  const total = allTickets.length

  const FILTER_TABS = [
    { key: null,          label: 'All'         },
    { key: 'open',        label: 'Open'        },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed',   label: 'Completed'   },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Tickets</h1>
        <Link href="/client/tickets/new">
          <Button size="sm"><Plus size={16} className="mr-1" />New Ticket</Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_TABS.map(tab => {
          const isActive = tab.key === null ? !searchParams.status : tab.key === searchParams.status
          return (
            <Link
              key={tab.label}
              href={tab.key ? `/client/tickets?status=${tab.key}` : '/client/tickets'}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                isActive
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-slate-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Status breakdown bar — only on All view */}
      {!activeFilter && total > 0 && (
        <div className="bg-slate-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-200">Ticket Overview</span>
            <span className="text-gray-500 dark:text-gray-400">{total} ticket{total !== 1 ? 's' : ''}</span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
            {counts.completed   > 0 && <div className="h-full bg-green-500 transition-all" style={{ width: `${Math.round((counts.completed/total)*100)}%` }} />}
            {counts.in_progress > 0 && <div className="h-full bg-amber-500 transition-all" style={{ width: `${Math.round((counts.in_progress/total)*100)}%` }} />}
            {counts.open        > 0 && <div className="h-full bg-blue-500 transition-all"  style={{ width: `${Math.round((counts.open/total)*100)}%` }} />}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
            {counts.open        > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500  inline-block" />Open ({counts.open})</span>}
            {counts.in_progress > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />In Progress ({counts.in_progress})</span>}
            {counts.completed   > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Completed ({counts.completed})</span>}
          </div>
        </div>
      )}

      {displayed.length === 0 ? (
        <div className="bg-slate-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-10 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
            {activeFilter ? 'No tickets in this category.' : 'No tickets yet.'}
          </p>
          {!activeFilter && (
            <Link href="/client/tickets/new">
              <Button variant="secondary" size="sm">Submit your first ticket</Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {active.length === 0 && !activeFilter ? (
              <p className="text-sm text-gray-400 text-center py-4">No active tickets.</p>
            ) : (
              active.map(t => <TicketRow key={t.id} ticket={t as Ticket} />)
            )}
          </div>

          {archived.length > 0 && (
            <CollapsibleArchive count={archived.length}>
              {archived.map(t => (
                <div key={t.id} className="px-4 py-3 opacity-75 hover:opacity-100 transition-opacity">
                  <TicketRow ticket={t as Ticket} />
                </div>
              ))}
            </CollapsibleArchive>
          )}
        </>
      )}
    </div>
  )
}
