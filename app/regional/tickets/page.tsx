import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import {
  STATUS_COLORS, STATUS_LABELS,
  PRIORITY_COLORS, PRIORITY_LABELS,
  formatDate,
} from '@/lib/utils'

export default async function RegionalTicketsPage() {
  const supabase    = createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: rmProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (rmProfile?.role !== 'regional_manager') redirect('/auth/login')

  // All stores in this region
  const { data: stores } = await adminClient
    .from('profiles')
    .select('id, company_name, sub_store')
    .eq('regional_manager_id', user.id)
    .in('role', ['store_manager', 'client'])

  const storeIds = (stores ?? []).map((s: any) => s.id)
  const storeMap = Object.fromEntries((stores ?? []).map((s: any) => [s.id, s]))

  const { data: tickets } = storeIds.length > 0
    ? await adminClient
        .from('tickets')
        .select('*, quotes(id, status, amount)')
        .in('client_id', storeIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const ticketList = (tickets ?? []).map((t: any) => ({
    ...t,
    store: storeMap[t.client_id],
    hasQuote: (t.quotes ?? []).length > 0,
  }))

  // Group by status for the filter pills
  const counts = {
    all:         ticketList.length,
    open:        ticketList.filter(t => t.status === 'open').length,
    quoted:      ticketList.filter(t => t.status === 'quoted').length,
    in_progress: ticketList.filter(t => t.status === 'in_progress').length,
    completed:   ticketList.filter(t => t.status === 'completed').length,
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">All Tickets</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {ticketList.length} ticket{ticketList.length !== 1 ? 's' : ''} across {storeIds.length} store{storeIds.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Status summary pills */}
      {ticketList.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'All',         value: counts.all,         color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
            { label: 'Open',        value: counts.open,        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
            { label: 'Quoted',      value: counts.quoted,      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
            { label: 'In Progress', value: counts.in_progress, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
            { label: 'Completed',   value: counts.completed,   color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
          ].map(p => (
            <span key={p.label} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${p.color}`}>
              {p.label}
              <span className="font-bold">{p.value}</span>
            </span>
          ))}
        </div>
      )}

      {storeIds.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">No stores in your region yet.</p>
          <Link href="/regional/stores" className="text-xs text-brand-600 hover:underline mt-1 inline-block">
            Add stores →
          </Link>
        </div>
      ) : ticketList.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">No tickets submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ticketList.map((ticket: any) => (
            <Link key={ticket.id} href={`/regional/tickets/${ticket.id}`}>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 hover:border-brand-300 dark:hover:border-brand-600 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{ticket.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {ticket.store?.company_name} — {ticket.store?.sub_store}
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
      )}
    </div>
  )
}
