import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CollapsibleArchive } from '@/components/ui/CollapsibleArchive'
import {
  STATUS_COLORS, STATUS_LABELS,
  PRIORITY_COLORS, PRIORITY_LABELS,
  formatDate, formatDateTime,
} from '@/lib/utils'
import type { Ticket } from '@/lib/types'

function TicketRow({ ticket }: { ticket: Ticket & { quotes?: any[] } }) {
  const quotes = (ticket as any).quotes ?? []
  const latestQuote = quotes
    .filter((q: any) => q.status !== 'declined')
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

  return (
    <Link href={`/client/tickets/${ticket.id}`}>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4 hover:border-brand-300 dark:hover:border-brand-600 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white truncate">{ticket.title}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{ticket.description}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Created: {formatDateTime(ticket.created_at)}
              {latestQuote && (
                <span className="ml-2 text-purple-500 dark:text-purple-400">Quoted: {formatDateTime(latestQuote.created_at)}</span>
              )}
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

export default async function ClientTicketsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tickets } = await supabase
    .from('tickets')
    .select('*, quotes(id, status, created_at)')
    .eq('client_id', user!.id)
    .order('created_at', { ascending: false })

  const active   = (tickets ?? []).filter(t => !['completed','cancelled'].includes(t.status))
  const archived = (tickets ?? []).filter(t =>  ['completed','cancelled'].includes(t.status))


  const allTickets = tickets ?? []
  const statusCounts = {
    open:        allTickets.filter((t: any) => t.status === 'open').length,
    quoted:      allTickets.filter((t: any) => t.status === 'quoted').length,
    accepted:    allTickets.filter((t: any) => t.status === 'accepted').length,
    in_progress: allTickets.filter((t: any) => t.status === 'in_progress').length,
    completed:   allTickets.filter((t: any) => t.status === 'completed').length,
    declined:    allTickets.filter((t: any) => t.status === 'declined').length,
    cancelled:   allTickets.filter((t: any) => t.status === 'cancelled').length,
  }
  const totalCount = allTickets.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Tickets</h1>
        <Link href="/client/tickets/new">
          <Button size="sm"><Plus size={16} className="mr-1" />New Ticket</Button>
        </Link>
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
            {statusCounts.completed > 0 && <div className="h-full bg-green-500 transition-all" style={{ width: `${Math.round((statusCounts.completed/totalCount)*100)}%` }} />}
            {statusCounts.declined > 0 && <div className="h-full bg-red-500 transition-all" style={{ width: `${Math.round((statusCounts.declined/totalCount)*100)}%` }} />}
            {statusCounts.cancelled > 0 && <div className="h-full bg-gray-400 transition-all" style={{ width: `${Math.round((statusCounts.cancelled/totalCount)*100)}%` }} />}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
            {statusCounts.open > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Open ({statusCounts.open})</span>}
            {statusCounts.quoted > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />Quoted ({statusCounts.quoted})</span>}
            {statusCounts.accepted > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />Accepted ({statusCounts.accepted})</span>}
            {statusCounts.in_progress > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />In Progress ({statusCounts.in_progress})</span>}
            {statusCounts.completed > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Completed ({statusCounts.completed})</span>}
            {statusCounts.declined > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Declined ({statusCounts.declined})</span>}
            {statusCounts.cancelled > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />Cancelled ({statusCounts.cancelled})</span>}
          </div>
        </div>
      )}

      {active.length === 0 && archived.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-10 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">No tickets yet.</p>
          <Link href="/client/tickets/new">
            <Button variant="secondary" size="sm">Submit your first ticket</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {active.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No active tickets.</p>
            ) : (
              active.map(t => <TicketRow key={t.id} ticket={t as Ticket} />)
            )}
          </div>

          <CollapsibleArchive count={archived.length}>
            {archived.map(t => (
              <div key={t.id} className="px-4 py-3 opacity-75 hover:opacity-100 transition-opacity">
                <TicketRow ticket={t as Ticket} />
              </div>
            ))}
          </CollapsibleArchive>
        </>
      )}
    </div>
  )
}
