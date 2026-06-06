import { createClient, createAdminClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { BackButton } from '@/components/ui/BackButton'
import {
  Phone, Mail, MapPin, Building2,
  FileText, CheckCircle, Clock, Archive, AlertCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { QuoteApprovalCard } from '@/components/regional/QuoteApprovalCard'
import {
  STATUS_COLORS, STATUS_LABELS,
  PRIORITY_COLORS, PRIORITY_LABELS,
  QUOTE_STATUS_LABELS, formatDate, formatDateTime, formatCurrency,
} from '@/lib/utils'
import type { Ticket, Quote } from '@/lib/types'

function TicketRow({ ticket }: { ticket: Ticket }) {
  return (
    <Link href={`/regional/tickets/${ticket.id}`}>
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
  )
}

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

  // Ticket groups
  const openTickets       = ticketList.filter(t => t.status === 'open' || t.status === 'quoted')
  const declinedTickets   = ticketList.filter(t => t.status === 'declined')
  const inProgressTickets = ticketList.filter(t => t.status === 'in_progress' || t.status === 'accepted')
  const completedTickets  = ticketList.filter(t => t.status === 'completed')
  const cancelledTickets  = ticketList.filter(t => t.status === 'cancelled')

  // Quote groups
  const pendingQuotes = ticketList
    .flatMap(t => (t.quotes ?? []).map((q: any) => ({ ...q, ticketTitle: t.title, ticketId: t.id })))
    .filter((q: any) => q.status === 'pending')

  const archivedQuotes = ticketList
    .flatMap(t => (t.quotes ?? []).map((q: any) => ({ ...q, ticketTitle: t.title, ticketId: t.id })))
    .filter((q: any) => q.status !== 'pending')
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Stats
  const acceptedQ   = allQuotes.filter((q: any) => q.status === 'accepted').length
  const declinedQ   = allQuotes.filter((q: any) => q.status === 'declined').length
  const pendingQ    = allQuotes.filter((q: any) => q.status === 'pending').length
  const acceptedValue = allQuotes.filter((q: any) => q.status === 'accepted').reduce((s: number, q: any) => s + (q.amount ?? 0), 0)
  const pendingValue  = allQuotes.filter((q: any) => q.status === 'pending').reduce((s: number, q: any) => s + (q.amount ?? 0), 0)
  const acceptanceRate = (acceptedQ + declinedQ) > 0
    ? Math.round((acceptedQ / (acceptedQ + declinedQ)) * 100)
    : null

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{store.company_name}</h1>
          <p className="text-sm text-brand-600 dark:text-brand-400">{store.sub_store}</p>
        </div>
      </div>

      {/* Info + summary grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Store contact */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Store Contact</p>
          {store.full_name && (
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <Building2 size={14} className="text-gray-400 shrink-0" /><span>{store.full_name}</span>
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
              <MapPin size={14} className="text-gray-400 shrink-0" /><span>{store.address}</span>
            </div>
          )}
        </div>

        {/* Ticket summary */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Ticket Summary</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{ticketList.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{openTickets.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Open Tickets</p>
            </div>
            <a href="#in-progress" className="group cursor-pointer">
              <p className="text-2xl font-bold text-teal-600 group-hover:underline">{inProgressTickets.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Approved</p>
            </a>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{ticketList.filter(t => t.status === 'in_progress').length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">In Progress</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{completedTickets.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-400">{cancelledTickets.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Cancelled</p>
            </div>
          </div>
        </div>

        {/* Quote summary */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quote Summary</p>
          <div className="space-y-3">
            <div>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(acceptedValue)}</p>
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
                <p className="text-lg font-bold text-yellow-600">{pendingQ}</p>
                <p className="text-xs text-gray-400">Pending</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{acceptedQ}</p>
                <p className="text-xs text-gray-400">Accepted</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-500">{declinedQ}</p>
                <p className="text-xs text-gray-400">Declined</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending quote value block */}
      {pendingValue > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/40 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Clock size={16} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(pendingValue)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Value of {pendingQ} quote{pendingQ !== 1 ? 's' : ''} awaiting your approval
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── OPEN TICKETS ─────────────────────────────────── */}
      {openTickets.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-blue-500" />
            Open Tickets ({openTickets.length})
          </h2>
          <div className="space-y-2">
            {openTickets.map(t => <TicketRow key={t.id} ticket={t} />)}
          </div>
        </div>
      )}

      {/* ── IN PROGRESS / APPROVED ─────────────────────────── */}
      {inProgressTickets.length > 0 && (
        <div id="in-progress">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Clock size={16} className="text-yellow-500" />
            In Progress / Approved ({inProgressTickets.length})
          </h2>
          <div className="space-y-2">
            {inProgressTickets.map(t => <TicketRow key={t.id} ticket={t} />)}
          </div>
        </div>
      )}

      {ticketList.length === 0 && (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400">No tickets from this store yet.</p>
        </div>
      )}

      {/* ── QUOTES AWAITING APPROVAL ─────────────────────────── */}
      {pendingQuotes.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <FileText size={16} className="text-yellow-500" />
            Quotes Awaiting Your Approval ({pendingQuotes.length})
          </h2>
          <div className="space-y-3">
            {(pendingQuotes as any[]).map((q: any) => (
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

      {/* ── COMPLETED ─────────────────────────────────── */}
      {completedTickets.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-500" />
            Completed ({completedTickets.length})
          </h2>
          <div className="space-y-2 opacity-80">
            {completedTickets.map(t => <TicketRow key={t.id} ticket={t} />)}
          </div>
        </div>
      )}

      {/* ── DECLINED ─────────────────────────────────── */}
      {declinedTickets.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-red-500 inline-flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">!</span>
            </span>
            Declined ({declinedTickets.length})
          </h2>
          <div className="space-y-2">
            {declinedTickets.map(t => <TicketRow key={t.id} ticket={t} />)}
          </div>
        </div>
      )}

      {/* ── CANCELLED ─────────────────────────────────── */}
      {cancelledTickets.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Archive size={16} className="text-gray-400" />
            Cancelled ({cancelledTickets.length})
          </h2>
          <div className="space-y-2 opacity-60">
            {cancelledTickets.map(t => <TicketRow key={t.id} ticket={t} />)}
          </div>
        </div>
      )}

      {/* ── QUOTE ARCHIVE ─────────────────────────────────── */}
      {archivedQuotes.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Archive size={16} className="text-gray-400" />
            Quote Archive ({archivedQuotes.length})
          </h2>
          <div className="space-y-2">
            {(archivedQuotes as any[]).map((q: any) => (
              <Link key={q.id} href={`/regional/tickets/${q.ticketId}`}>
                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3 hover:border-brand-300 dark:hover:border-brand-600 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{q.ticketTitle}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(q.amount)} · {formatDateTime(q.created_at)}</p>
                    {q.decline_reason && (
                      <p className="text-xs text-red-500 mt-0.5">Reason: {q.decline_reason}</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                    q.status === 'accepted'
                      ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {q.status === 'accepted' ? 'Approved' : 'Declined'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
