import { createClient, createAdminClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { BackButton } from '@/components/ui/BackButton'
import {
  Phone, Mail, MapPin, Building2,
  FileText, CheckCircle, Clock, Archive,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { QuoteApprovalCard } from '@/components/regional/QuoteApprovalCard'
import {
  STATUS_COLORS, STATUS_LABELS,
  PRIORITY_COLORS, PRIORITY_LABELS,
  QUOTE_STATUS_LABELS, formatDate, formatCurrency,
} from '@/lib/utils'
import type { Ticket, Quote } from '@/lib/types'

export default async function RegionalStoreDetailPage({ params }: { params: { id: string } }) {
  const supabase    = createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: store } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .eq('regional_manager_id', user.id)
    .in('role', ['store_manager', 'client'])
    .single()

  if (!store) notFound()

  const { data: tickets } = await adminClient
    .from('tickets')
    .select('*, quotes(*)')
    .eq('client_id', params.id)
    .order('created_at', { ascending: false })

  const ticketList = (tickets ?? []) as (Ticket & { quotes: Quote[] })[]
  const allQuotes  = ticketList.flatMap(t => t.quotes ?? [])

  const stats = {
    total:      ticketList.length,
    open:       ticketList.filter(t => t.status === 'open').length,
    inProgress: ticketList.filter(t => t.status === 'in_progress').length,
    completed:  ticketList.filter(t => t.status === 'completed').length,
    pendingQ:   allQuotes.filter(q => q.status === 'pending').length,
    acceptedQ:  allQuotes.filter(q => q.status === 'accepted').length,
    totalValue: allQuotes
      .filter(q => q.status === 'accepted')
      .reduce((s, q) => s + (q.amount ?? 0), 0),
  }

  const declined = allQuotes.filter(q => q.status === 'declined').length
  const acceptanceRate = (stats.acceptedQ + declined) > 0
    ? Math.round((stats.acceptedQ / (stats.acceptedQ + declined)) * 100)
    : null

  const openTickets   = ticketList.filter(t => !['completed','cancelled'].includes(t.status))
  const closedTickets = ticketList.filter(t =>  ['completed','cancelled'].includes(t.status))

  const pendingQuotes = ticketList
    .flatMap(t => (t.quotes ?? []).map(q => ({ ...q, ticketTitle: t.title, ticketId: t.id })))
    .filter(q => q.status === 'pending')

  const archivedQuotes = ticketList
    .flatMap(t => (t.quotes ?? []).map(q => ({ ...q, ticketTitle: t.title })))
    .filter(q => q.status !== 'pending')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div className="space-y-6 max-w-4xl">

      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{store.company_name}</h1>
          <p className="text-sm text-brand-600 dark:text-brand-400">{store.sub_store}</p>
        </div>
      </div>

      {/* Info + stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Store Contact</p>
          {store.full_name && (
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <Building2 size={14} className="text-gray-400 shrink-0" />
              <span>{store.full_name}</span>
            </div>
          )}
          {store.email && (
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <Mail size={14} className="text-gray-400 shrink-0" />
              <a href={`mailto:${store.email}`} className="hover:underline truncate">{store.email}</a>
            </div>
          )}
          {store.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <Phone size={14} className="text-gray-400 shrink-0" />
              <a href={`tel:${store.phone}`} className="hover:underline">{store.phone}</a>
            </div>
          )}
          {store.address && (
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <MapPin size={14} className="text-gray-400 shrink-0" />
              <span>{store.address}</span>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Ticket Summary</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total',       value: stats.total,      color: 'text-gray-900 dark:text-white' },
              { label: 'Open',        value: stats.open,       color: 'text-blue-600' },
              { label: 'In Progress', value: stats.inProgress, color: 'text-yellow-600' },
              { label: 'Completed',   value: stats.completed,  color: 'text-green-600' },
            ].map(s => (
              <div key={s.label}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quote Summary</p>
          <div className="space-y-3">
            <div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.totalValue)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total accepted value</p>
            </div>
            {acceptanceRate !== null && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500 dark:text-gray-400">Acceptance rate</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{acceptanceRate}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${acceptanceRate}%` }} />
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <div>
                <p className="text-lg font-bold text-yellow-600">{stats.pendingQ}</p>
                <p className="text-xs text-gray-400">Pending</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{stats.acceptedQ}</p>
                <p className="text-xs text-gray-400">Accepted</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending quotes awaiting approval */}
      {pendingQuotes.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <FileText size={16} className="text-yellow-500" />
            Quotes Awaiting Your Approval ({pendingQuotes.length})
          </h2>
          <div className="space-y-3">
            {pendingQuotes.map((q: any) => (
              <QuoteApprovalCard
                key={q.id}
                quote={q as Quote}
                ticketTitle={q.ticketTitle}
                ticketId={q.ticketId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active tickets */}
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Clock size={16} className="text-brand-600" />
          Active Tickets ({openTickets.length})
        </h2>
        {openTickets.length === 0 ? (
          <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
            <CheckCircle size={20} className="mx-auto text-green-500 mb-2" />
            <p className="text-sm text-green-700 dark:text-green-400">No active tickets.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {openTickets.map(ticket => (
              <Link key={ticket.id} href={`/regional/tickets/${ticket.id}`}>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 hover:border-brand-300 dark:hover:border-brand-600 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{ticket.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(ticket.created_at)}</p>
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
            ))}
          </div>
        )}
      </div>

      {/* Completed tickets */}
      {closedTickets.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-500" />
            Completed & Cancelled ({closedTickets.length})
          </h2>
          <div className="space-y-2">
            {closedTickets.map(ticket => (
              <div key={ticket.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 opacity-75">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-700 dark:text-gray-300 truncate">{ticket.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(ticket.updated_at)}</p>
                  </div>
                  <Badge className={STATUS_COLORS[ticket.status]}>
                    {STATUS_LABELS[ticket.status]}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quote archive */}
      {archivedQuotes.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Archive size={16} className="text-gray-400" />
            Quote Archive ({archivedQuotes.length})
          </h2>
          <div className="space-y-2">
            {archivedQuotes.map((q: any) => (
              <div key={q.id} className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{q.ticketTitle}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(q.amount)} · {formatDate(q.created_at)}</p>
                </div>
                <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                  q.status === 'accepted'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}>
     