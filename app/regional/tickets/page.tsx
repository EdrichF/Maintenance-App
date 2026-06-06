import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { CollapsibleArchive } from '@/components/ui/CollapsibleArchive'
import { SearchInput } from '@/components/ui/SearchInput'
import {
  STATUS_COLORS, STATUS_LABELS,
  PRIORITY_COLORS, PRIORITY_LABELS,
  formatDate,
} from '@/lib/utils'

export default async function RegionalTicketsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string; store?: string }
}) {
  const supabase    = createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: rmProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (rmProfile?.role !== 'regional_manager') redirect('/auth/login')

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

  const allTickets = (tickets ?? []).map((t: any) => ({
    ...t,
    store: storeMap[t.client_id],
  }))

  // Apply filters
  const activeStatus = searchParams.status ?? ''
  const activeStore  = searchParams.store  ?? ''
  const searchQuery  = (searchParams.q ?? '').toLowerCase().trim()

  const activeStoreName = activeStore
    ? (() => { const s = storeMap[activeStore]; return s ? `${s.company_name} — ${s.sub_store}` : '' })()
    : ''

  const filtered = allTickets.filter((t: any) => {
    const matchesStatus = !activeStatus || t.status === activeStatus
    const matchesStore  = !activeStore  || t.client_id === activeStore
    const matchesSearch = !searchQuery ||
      t.title.toLowerCase().includes(searchQuery) ||
      t.store?.company_name?.toLowerCase().includes(searchQuery) ||
      t.store?.sub_store?.toLowerCase().includes(searchQuery)
    return matchesStatus && matchesStore && matchesSearch
  })

  const active   = filtered.filter((t: any) => !['completed','cancelled','declined'].includes(t.status))
  const archived = filtered.filter((t: any) =>  ['completed','cancelled','declined'].includes(t.status))

  const counts = {
    all:         allTickets.length,
    open:        allTickets.filter((t: any) => t.status === 'open').length,
    quoted:      allTickets.filter((t: any) => t.status === 'quoted').length,
    in_progress: allTickets.filter((t: any) => t.status === 'in_progress').length,
    completed:   allTickets.filter((t: any) => t.status === 'completed').length,
    declined:    allTickets.filter((t: any) => t.status === 'declined').length,
  }

  const filterPills = [
    { label: 'All',         status: '',            count: counts.all,         active: 'bg-brand-600 text-white border-brand-600',         inactive: 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400' },
    { label: 'Open Tickets',status: 'open',        count: counts.open,        active: 'bg-blue-600 text-white border-blue-600',           inactive: 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/40 hover:border-blue-400' },
    { label: 'Quoted',      status: 'quoted',      count: counts.quoted,      active: 'bg-purple-600 text-white border-purple-600',       inactive: 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/40 hover:border-purple-400' },
    { label: 'In Progress', status: 'in_progress', count: counts.in_progress, active: 'bg-amber-500 text-white border-amber-500',         inactive: 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40 hover:border-amber-400' },
    { label: 'Completed',   status: 'completed',   count: counts.completed,   active: 'bg-green-600 text-white border-green-600',         inactive: 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/40 hover:border-green-400' },
    { label: 'Declined',    status: 'declined',    count: counts.declined,    active: 'bg-red-600 text-white border-red-600',             inactive: 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/40 hover:border-red-400' },
  ]

  function filterHref(status: string) {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (activeStore) params.set('store', activeStore)
    if (searchQuery) params.set('q', searchQuery)
    const qs = params.toString()
    return `/regional/tickets${qs ? `?${qs}` : ''}`
  }


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
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">All Tickets</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {filtered.length} of {allTickets.length} ticket{allTickets.length !== 1 ? 's' : ''} across {storeIds.length} store{storeIds.length !== 1 ? 's' : ''}
        </p>
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

      {/* Active store filter banner */}
      {activeStoreName && (
        <div className="flex items-center justify-between bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800/40 rounded-xl px-4 py-2.5">
          <p className="text-sm font-medium text-brand-700 dark:text-brand-300">
            Filtered by store: <span className="font-semibold">{activeStoreName}</span>
          </p>
          <Link
            href={`/regional/tickets${activeStatus ? `?status=${activeStatus}` : ''}`}
            className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
          >
            Clear store filter ×
          </Link>
        </div>
      )}

      {/* Search */}
      <SearchInput placeholder="Search by ticket title or store name…" />

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {filterPills.map(p => {
          const isActive = activeStatus === p.status
          return (
            <Link
              key={p.label}
              href={filterHref(p.status)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${isActive ? p.active : p.inactive}`}
            >
              {p.label}
              <span className={`font-bold ${isActive ? 'opacity-90' : ''}`}>{p.count}</span>
            </Link>
          )
        })}
      </div>

      {storeIds.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">No stores in your region yet.</p>
          <Link href="/regional/stores" className="text-xs text-brand-600 hover:underline mt-1 inline-block">
            Add stores →
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">No tickets match your filter.</p>
          <Link href="/regional/tickets" className="text-xs text-brand-600 hover:underline mt-1 inline-block">
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((ticket: any) => (
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

          {archived.length > 0 && (
            <CollapsibleArchive count={archived.length}>
              {archived.map((ticket: any) => (
                <Link key={ticket.id} href={`/regional/tickets/${ticket.id}`}>
                  <div className="px-4 py-3 opacity-75 hover:opacity-100 transition-opacity hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-700 dark:text-gray-300 truncate">{ticket.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                          {ticket.store?.company_name} — {ticket.store?.sub_store} · {formatDate(ticket.updated_at)}
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
          )}
        </div>
      )}
    </div>
  )
}
