import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Store, AlertCircle, Clock, FileText,
  TrendingUp, CheckCircle, ArrowRight, Zap,
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
  const snagTickets           = allTickets.filter((t: any) => t.status === 'snag').length
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
      return { ...s, urgentCount: urgent, highCount: high }
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

      {/* Summary stats — all clickable */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        {[
          { label: 'Stores',          value: stats.totalStores,        icon: Store,       color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/30',    href: '/regional/stores' },
          { label: 'Open Tickets',    value: stats.openTickets,        icon: FileText,    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',       href: '/regional/tickets' },
          { label: 'Urgent',          value: stats.urgentTickets,      icon: AlertCircle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30',          href: '/regional/tickets?status=open' },
          { label: 'Pending Quotes',  value: stats.pendingQuotes,      icon: Clock,       color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30', href: '/regional/tickets?status=quoted' },
          { label: 'Snag',            value: snagTickets,              icon: AlertCircle, color: 'text-amber-700 bg-amber-50 dark:bg-amber-900/30',      href: '/regional/snag' },
          { label: 'Done This Month', value: stats.completedThisMonth, icon: CheckCircle, color: 'text-green-600 bg-green-50 dark:bg-green-900/30',    href: '/regional/tickets?status=completed' },
          { label: 'Accepted Value',  value: formatCurrency(stats.totalQuoteValue),   icon: TrendingUp, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30', href: '', noLink: true },
          { label: 'Pending Value',   value: formatCurrency(stats.pendingQuoteValue), icon: Clock,      color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30', href: '', noLink: true },
        ].map(stat => (
          (stat as any).noLink
            ? <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-2">
                <div className={`p-2 rounded-lg w-fit ${stat.color}`}><stat.icon size={16} /></div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{stat.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
                </div>
              </div>
            : <Link key={stat.label} href={(stat as any).href} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-2 hover:border-brand-300 dark:hover:border-brand-600 transition-colors">
                <div className={`p-2 rounded-lg w-fit ${stat.color}`}><stat.icon size={16} /></div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{stat.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
                </div>
              </Link>
        ))}
      </div>

      {/* Ticket status bar */}
      {totalTickets > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Store performance */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Store size={16} className="text-brand-600" /> Store Performance
            </h2>
            <Link href="/regional/stores" className="text-sm text-brand-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {storePerformance.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
              <Store size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No stores assigned yet.</p>
              <p className="text-xs text-gray-400 mt-1">Ask your administrator to link stores to your account.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {storePerformance.map((store: any) => (
                <Link key={store.id} href={`/regional/stores/${store.id}`}>
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-brand-300 dark:hover:border-brand-600 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{store.company_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{store.sub_store}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {store.ticketCounts.total > 0 && store.acceptanceRate !== null && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            store.acceptanceRate >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            store.acceptanceRate >= 40 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {store.acceptanceRate}% accept
                          </span>
                        )}
                        <ArrowRight size={14} className="text-gray-400" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1 flex-1 h-1.5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                        {store.ticketCounts.total > 0 ? (
                          <>
                            <div className="bg-blue-500 transition-all" style={{ width: `${(store.ticketCounts.open / store.ticketCounts.total) * 100}%` }} />
                            <div className="bg-amber-500 transition-all" style={{ width: `${(store.ticketCounts.in_progress / store.ticketCounts.total) * 100}%` }} />
                            <div className="bg-green-500 transition-all" style={{ width: `${(store.ticketCounts.completed / store.ticketCounts.total) * 100}%` }} />
                            {store.ticketCounts.pending_sign_off > 0 && (
                              <div className="bg-orange-400 transition-all" style={{ width: `${(store.ticketCounts.pending_sign_off / store.ticketCounts.total) * 100}%` }} />
                            )}
                          </>
                        ) : (
                          <div className="bg-gray-200 dark:bg-gray-600 w-full" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />{store.ticketCounts.open} open</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />{store.ticketCounts.in_progress} in progress</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />{store.ticketCounts.completed} completed</span>
                        {store.ticketCounts.pending_sign_off > 0 && (
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />{store.ticketCounts.pending_sign_off} sign-off</span>
                        )}
                      </div>
                    </div>
                    {store.lastActivity && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Last activity: {formatDateTime(store.lastActivity)}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Needs attention */}
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <Zap size={16} className="text-red-500" /> Needs Attention
            </h2>
            {storesNeedingAttention.length === 0 ? (
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
                <CheckCircle size={20} className="mx-auto text-green-500 mb-1" />
                <p className="text-xs text-green-700 dark:text-green-400">All stores are in good shape!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {storesNeedingAttention.map((store: any) => (
                  <Link key={store.id} href={`/regional/stores/${store.id}`}>
                    <div className="bg-white dark:bg-gray-800 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5 hover:border-red-300 transition-colors">
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
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <Clock size={16} className="text-brand-600" /> Recent Tickets
            </h2>
            {recentTickets.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No tickets yet.</p>
            ) : (
              <div className="space-y-2">
                {recentTickets.map((ticket: any) => (
                  <Link key={ticket.id} href={`/regional/tickets/${ticket.id}`}>
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 hover:border-brand-300 dark:hover:border-brand-600 transition-colors">
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
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDateTime(ticket.created_at)}</p>
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
