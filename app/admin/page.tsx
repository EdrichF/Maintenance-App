import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import {
  STATUS_COLORS, STATUS_LABELS,
  PRIORITY_COLORS, PRIORITY_LABELS,
  formatDate, formatDateTime,
} from '@/lib/utils'
import type { Ticket } from '@/lib/types'
import { AlertCircle, Clock, CheckCircle, List, Star } from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = createClient()
  const adminDb  = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [ticketsResult, ratingsResult, profileResult] = await Promise.all([
    supabase
      .from('tickets')
      .select('*, profiles(full_name, company_name, sub_store), quotes(id, decline_reason, status, created_at)')
      .order('created_at', { ascending: false }),
    user
      ? adminDb.from('ratings').select('score').eq('contractor_id', user.id)
      : Promise.resolve({ data: [] }),
    user
      ? supabase.from('profiles').select('company_name').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  const tickets     = ticketsResult.data
  const companyName = (profileResult as any).data?.company_name ?? 'Dashboard'
  const ratings     = (ratingsResult as any).data ?? []
  const ratingCount = ratings.length
  const avgRating   = ratingCount > 0
    ? ratings.reduce((sum: number, r: any) => sum + r.score, 0) / ratingCount
    : null

  const total    = tickets?.length ?? 0
  const open     = tickets?.filter(t => t.status === 'open' || t.status === 'declined').length ?? 0
  const urgent   = tickets?.filter(t => t.priority === 'urgent' && t.status === 'open').length ?? 0
  const quoted   = tickets?.filter(t => t.status === 'quoted').length ?? 0
  const active   = tickets?.filter(t => t.status === 'in_progress').length ?? 0
  const completed = tickets?.filter(t => t.status === 'completed').length ?? 0
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0
  const openActivePct = total > 0 ? Math.round(((open + active + quoted) / total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{companyName}</h1>
        <Link href="/admin/reviews">
          {avgRating !== null ? (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-2 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
              <Star size={16} className="fill-amber-400 text-amber-400 shrink-0" />
              <span className="text-sm font-bold text-amber-700 dark:text-amber-300">{avgRating.toFixed(1)} / 5</span>
              <span className="text-xs text-amber-600 dark:text-amber-400">({ratingCount} review{ratingCount !== 1 ? 's' : ''})</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <Star size={16} className="text-gray-300 dark:text-gray-600 shrink-0" />
              <span className="text-xs text-gray-400">No ratings yet</span>
            </div>
          )}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Open Tickets', value: open,   icon: List,         color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
          { label: 'Urgent',     value: urgent, icon: AlertCircle,  color: 'text-red-600 bg-red-50 dark:bg-red-900/30' },
          { label: 'Quoted',     value: quoted, icon: Clock,        color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30' },
          { label: 'In Progress',value: active, icon: CheckCircle,  color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30' },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
            <div className={`p-2 rounded-full ${stat.color}`}>
              <stat.icon size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold dark:text-white">{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Completed vs Open Tickets bar */}
      {total > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-200">Completed vs Open Tickets</span>
            <span className="text-gray-500 dark:text-gray-400">{completed} of {total} completed</span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
            <div className="h-full bg-green-500 transition-all rounded-l-full" style={{ width: `${completionPct}%` }} />
            <div className="h-full bg-blue-400 transition-all" style={{ width: `${openActivePct}%` }} />
          </div>
          <div className="flex items-center gap-6 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-green-700 dark:text-green-400">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />{completionPct}% Completed ({completed})
            </span>
            <span className="flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />{openActivePct}% Open Tickets ({open + quoted + active})
            </span>
          </div>
        </div>
      )}

      {/* Recent tickets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">Recent Tickets</h2>
          <Link href="/admin/tickets" className="text-sm text-brand-600 hover:underline">View all</Link>
        </div>

        <div className="space-y-2">
          {(tickets?.slice(0, 8) as (Ticket & { profiles: any; quotes: any[] })[])?.map(ticket => {
            const tkt = ticket as any
            const declinedQuote = tkt.quotes?.find((q: any) => q.status === 'declined' && q.decline_reason)
            const latestQuote = (tkt.quotes ?? [])
              .filter((q: any) => q.status !== 'declined')
              .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
            return (
              <Link key={ticket.id} href={`/admin/tickets/${ticket.id}`}>
                <div className={`border rounded-xl px-4 py-3 hover:border-brand-300 dark:hover:border-brand-600 transition-colors ${
                  ticket.status === 'declined'
                    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/40'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{ticket.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {(ticket as any).profiles?.company_name} — {(ticket as any).profiles?.sub_store} · {(ticket as any).profiles?.full_name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        Created: {formatDateTime(ticket.created_at)}
                        {latestQuote && (
                          <span className="ml-2 text-purple-500 dark:text-purple-400">· Quoted: {formatDateTime(latestQuote.created_at)}</span>
                        )}
                      </p>
                      {tkt.status === 'declined' && declinedQuote?.decline_reason && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                          Declined — {declinedQuote.decline_reason}
                        </p>
                      )}
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
            )
          })}
        </div>
      </div>
    </div>
  )
}
