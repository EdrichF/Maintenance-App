import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Building2, ShieldAlert, ReceiptText,
  TrendingUp, CheckCircle2, Zap, ClipboardList,
  Wrench, BadgeCheck, Banknote, Clock4,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import {
  STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS,
  formatDate, formatDateTime, formatCurrency,
} from '@/lib/utils'
import type { Ticket, Quote } from '@/lib/types'

export default async function RegionalDashboard() {
  const supabase      = createClient()
  const adminClient   = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: rmProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (rmProfile?.role !== 'regional_manager') redirect('/auth/login')

  const { data: stores } = await adminClient
    .from('profiles')
    .select(`
      id, full_name, company_name, sub_store, email, phone, address,
      tickets(
        id, title, status, priority, created_at, updated_at,
        quotes(id, amount, status, created_at)
      )
    `)
    .eq('regional_manager_id', user.id)
    .in('role', ['store_manager', 'client'])
    .order('company_name')

  const storeList = (stores ?? []) as any[]

  const allTickets = storeList.flatMap((s: any) => s.tickets ?? [])
  const allQuotes  = allTickets.flatMap((t: any) => t.quotes ?? [])

  const totalTickets          = allTickets.length
  const completedTickets      = allTickets.filter((t: any) => t.status === 'completed').length
  const openActiveTickets     = allTickets.filter((t: any) => ['open','quoted','accepted','in_progress'].includes(t.status)).length
  const pendingSignOffTickets = allTickets.filter((t: any) => t.status === 'pending_sign_off').length
  const snagTickets           = allTickets.filter((t: any) => ['snag', 'snag_in_progress'].includes(t.status)).length
  const declinedTickets       = allTickets.filter((t: any) => t.status === 'declined').length

  const completionPct     = totalTickets > 0 ? Math.round((completedTickets      / totalTickets) * 100) : 0
  const openPct           = totalTickets > 0 ? Math.round((openActiveTickets    / totalTickets) * 100) : 0
  const pendingSignOffPct = totalTickets > 0 ? Math.round((pendingSignOffTickets / totalTickets) * 100) : 0
  const snagPct           = totalTickets > 0 ? Math.round((snagTickets           / totalTickets) * 100) : 0
  const declinedPct       = totalTickets > 0 ? Math.round((declinedTickets       / totalTickets) * 100) : 0

  const stats = {
    totalStores:     storeList.length,
    openTickets:     openActiveTickets,
    urgentTickets:   allTickets.filter((t: any) => t.priority === 'urgent' && !['completed','cancelled','declined'].includes(t.status)).length,
    pendingQuotes:   allQuotes.filter((q: any) => q.status === 'pending').length,
    completedThisMonth: allTickets.filter((t: any) => {
      if (t.status !== 'completed') return false
      const d = new Date(t.updated_at)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length,
    totalQuoteValue:   allQuotes.filter((q: any) => q.status === 'accepted').reduce((sum: number, q: any) => sum + (q.amount ?? 0), 0),
    pendingQuoteValue: allQuotes.filter((q: any) => q.status === 'pending').reduce((sum: number, q: any) => sum + (q.amount ?? 0), 0),
  }

  const storesNeedingAttention = storeList
    .map((s: any) => {
      const urgent = (s.tickets ?? []).filter((t: any) => t.priority === 'urgent' && !['completed','cancelled','declined'].includes(t.status)).length
      const high   = (s.tickets ?? []).filter((t: any) => t.priority === 'high'   && !['completed','cancelled','declined'].includes(t.status)).length
      const allTix = s.tickets ?? []
      const lastAct = allTix.length > 0
        ? allTix.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : null
      return { ...s, urgentCount: urgent, highCount: high, lastActivity: lastAct }
    })
    .filter((s: any) => s.urgentCount > 0 || s.highCount > 0)
    .sort((a: any, b: any) => b.urgentCount - a.urgentCount)
    .slice(0, 5)

  const recentTickets = allTickets
    .map((t: any) => {
      const store = storeList.find((s: any) => (s.tickets ?? []).some((st: any) => st.id === t.id))
      return { ...t, store }
    })
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)

  const storePerformance = storeList.map((s: any) => {
    const tickets = s.tickets ?? []
    const quotes  = tickets.flatMap((t: any) => t.quotes ?? [])
    const accepted = quotes.filter((q: any) => q.status === 'accepted').length
    const total    = quotes.filter((q: any) => q.status !== 'pending').length
    return {
      ...s,
      ticketCounts: {
        open:             tickets.filter((t: any) => t.status === 'open').length,
        in_progress:      tickets.filter((t: any) => t.status === 'in_progress').length,
        completed:        tickets.filter((t: any) => t.status === 'completed').length,
        pending_sign_off: tickets.filter((t: any) => t.status === 'pending_sign_off').length,
        total:            tickets.length,
      },
      acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : null,
      lastActivity: tickets.length > 0
        ? tickets.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : null,
    }
  })

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="space-y-8">

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {greeting}, {rmProfile.full_name?.split(' ')[0] ?? 'Manager'} 👋
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Regional overview · {new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[
          { label: 'Stores',           value: stats.totalStores,                     icon: Building2,     accent: 'border-l-brand-500',   iconCls: 'text-brand-600 dark:text-brand-400',   href: '/regional/stores' },
          { label: 'Open Tickets',     value: stats.openTickets,                     icon: ClipboardList, accent: 'border-l-blue-500',    iconCls: 'text-blue-600 dark:text-blue-400',     href: '/regional/tickets' },
          { label: 'Urgent',           value: stats.urgentTickets,                   icon: ShieldAlert,   accent: 'border-l-red-500',     iconCls: 'text-red-600 dark:text-red-400',       href: '/regional/tickets?status=open' },
          { label: 'Pending Quotes',   value: stats.pendingQuotes,                   icon: ReceiptText,   accent: 'border-l-yellow-500',  iconCls: 'text-yellow-600 dark:text-yellow-400', href: '/regional/tickets?status=quoted' },
          { label: 'Snag',             value: snagTickets,                           icon: Wrench,        accent: 'border-l-amber-500',   iconCls: 'text-amber-600 dark:text-amber-400',   href: '/regional/snag' },
          { label: 'Pending Sign-off', value: pendingSignOffTickets,                 icon: BadgeCheck,    accent: 'border-l-orange-500',  iconCls: 'text-orange-600 dark:text-orange-400', href: '/regional/signoff' },
          { label: 'Done This Month',  value: stats.completedThisMonth,              icon: CheckCircle2,  accent: 'border-l-green-500',   iconCls: 'text-green-600 dark:text-green-400',   href: '/regional/tickets?status=completed' },
          { label: 'Accepted Value',   value: formatCurrency(stats.totalQuoteValue),   icon: Banknote,  accent: 'border-l-purple-500', iconCls: 'text-purple-600 dark:text-purple-400', href: null, currency: true },
          { label: 'Pending Value',    value: formatCurrency(stats.pendingQuoteValue),  icon: Clock4,    accent: 'border-l-slate-400',  iconCls: 'text-slate-500 dark:text-slate-400',   href: null, currency: true },
        ].map(stat => {
          const isCurrency = (stat as any).currency === true
          const inner = isCurrency ? (
            /* Currency card — stacked layout so long values never overflow */
            <div className={`bg-slate-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 ${stat.accent} p-4 flex flex-col justify-between gap-2 h-full`}>
              <div className="flex items-center gap-2">
                <stat.icon size={15} className={`shrink-0 ${stat.iconCls}`} />
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{stat.label}</p>
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-snug break-words">{stat.value}</p>
            </div>
          ) : (
            /* Numeric card — horizontal layout */
            <div className={`bg-slate-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 ${stat.accent} p-4 flex items-center gap-4 h-full`}>
              <stat.icon size={22} className={`shrink-0 ${stat.iconCls}`} />
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900 dark:text-white leading-none">{stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
              </div>
            </div>
          )
          return stat.href
            ? <Link key={stat.label} href={(stat as any).href} className="hover:opacity-80 transition-opacity">{inner}</Link>
            : <div key={stat.label}>{inner}</div>
        })}
      </div>

      {/* Ticket status bar */}
      {totalTickets > 0 && (
        <div className="bg-slate-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-200">Ticket Status Overview</span>
            <span className="text-gray-500 dark:text-gray-400">{completedTickets} of {totalTickets} completed</span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
            <div className="h-full bg-green-500 transition-all rounded-l-full" style={{ width: `${completionPct}%` }} />
            <div className="h-full bg-blue-400 transition-all" style={{ width: `${openPct}%` }} />
            {pendingSignOffPct > 0 && <div className="h-full bg-orange-400 transition-all" style={{ width: `${pendingSignOffPct}%` }} />}
            {snagPct > 0 && <div className="h-full bg-amber-500 transition-all" style={{ width: `${snagPct}%` }} />}
            {declinedPct > 0 && <div className="h-full bg-red-400 transition-all" style={{ width: `${declinedPct}%` }} />}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-green-700 dark:text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />{completionPct}% Completed ({completedTickets})
            </span>
            <span className="flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />{openPct}% Open ({openActiveTickets})
            </span>
            {pendingSignOffTickets > 0 && (
              <span className="flex items-center gap-1.5 font-medium text-orange-600 dark:text-orange-400">
                <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />{pendingSignOffPct}% Pending Sign-off ({pendingSignOffTickets})
              </span>
            )}
            {snagTickets > 0 && (
              <span className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />{snagPct}% Snag ({snagTickets})
              </span>
            )}
            {declinedTickets > 0 && (
              <span className="flex items-center gap-1.5 font-medium text-red-600 dark:text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />{declinedPct}% Declined ({declinedTickets})
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left column */}
        <div className="space-y-6">

          {/* Needs attention */}
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <Zap size={16} className="text-red-500" /> Needs Attention
            </h2>
            {storesNeedingAttention.length === 0 ? (
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
                <CheckCircle2 size={20} className="mx-auto text-green-500 mb-1" />
                <p className="text-xs text-green-700 dark:text-green-400">All stores are in good shape!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {storesNeedingAttention.map((store: any) => (
                  <Link key={store.id} href={`/regional/stores/${store.id}`}>
                    <div className="bg-slate-50 dark:bg-gray-800 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5 hover:border-red-300 transition-colors">
                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{store.company_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{store.sub_store}</p>
                      <div className="flex gap-2 mt-1.5">
                        {store.urgentCount > 0 && (
                          <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">
                            {store.urgentCount} urgent
                          </span>
                        )}
                        {store.highCount > 0 && (
                          <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded-full">
                            {store.highCount} high
                          </span>
                        )}
                      </div>
                      {store.lastActivity && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Last ticket: {formatDateTime(store.lastActivity)}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <Clock4 size={16} className="text-brand-600" /> Recent Tickets
            </h2>
            {recentTickets.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No tickets yet.</p>
            ) : (
              <div className="space-y-2">
                {recentTickets.map((ticket: any) => (
                  <Link key={ticket.id} href={`/regional/tickets/${ticket.id}`}>
                    <div className="bg-slate-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 hover:border-brand-300 dark:hover:border-brand-600 transition-colors">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ticket.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {ticket.store?.company_name} — {ticket.store?.sub_store}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge className={`text-xs ${PRIORITY_COLORS[ticket.priority as keyof typeof PRIORITY_COLORS]}`}>
                          {PRIORITY_LABELS[ticket.priority as keyof typeof PRIORITY_LABELS]}
                        </Badge>
                        <Badge className={`text-xs ${STATUS_COLORS[ticket.status as keyof typeof STATUS_COLORS]}`}>
                          {STATUS_LABELS[ticket.status as keyof typeof STATUS_LABELS]}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Created: {formatDateTime(ticket.created_at)}
                        {(() => { const qs = (ticket as any).quotes ?? []; const latest = qs.filter((q: any) => q.status !== 'declined').sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]; if (!latest) return null; return <span className="ml-2 text-purple-500 dark:text-purple-400">Quoted: {formatDateTime(latest.created_at)}</span> })()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
