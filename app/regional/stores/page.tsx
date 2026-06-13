export const dynamic = 'force-dynamic'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Building2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { AddStoreForm } from '@/components/regional/AddStoreForm'

export default async function RegionalStoresPage() {
  const supabase    = createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: stores } = await adminClient
    .from('profiles')
    .select(`
      id, full_name, company_name, sub_store,
      tickets(id, status, priority, created_at, updated_at, quotes(id, amount, status))
    `)
    .eq('regional_manager_id', user.id)
    .in('role', ['store_manager', 'client'])
    .order('company_name')

  const storeList = (stores ?? []).map((s: any) => {
    const tickets = s.tickets ?? []
    const quotes  = tickets.flatMap((t: any) => t.quotes ?? [])

    const counts = {
      open:             tickets.filter((t: any) => t.status === 'open').length,
      quoted:           tickets.filter((t: any) => t.status === 'quoted').length,
      accepted:         tickets.filter((t: any) => t.status === 'accepted').length,
      in_progress:      tickets.filter((t: any) => t.status === 'in_progress').length,
      completed:        tickets.filter((t: any) => t.status === 'completed').length,
      pending_sign_off: tickets.filter((t: any) => t.status === 'pending_sign_off').length,
      snag:             tickets.filter((t: any) => ['snag','snag_in_progress'].includes(t.status)).length,
      declined:         tickets.filter((t: any) => t.status === 'declined').length,
      cancelled:        tickets.filter((t: any) => t.status === 'cancelled').length,
      total:            tickets.length,
    }

    const decidedQuotes  = quotes.filter((q: any) => q.status !== 'pending').length
    const acceptedQuotes = quotes.filter((q: any) => q.status === 'accepted').length
    const acceptanceRate = decidedQuotes > 0 ? Math.round((acceptedQuotes / decidedQuotes) * 100) : null
    const acceptedValue  = quotes.filter((q: any) => q.status === 'accepted').reduce((s: number, q: any) => s + (q.amount ?? 0), 0)
    const pendingValue   = quotes.filter((q: any) => q.status === 'pending').reduce((s: number, q: any) => s + (q.amount ?? 0), 0)
    const pendingQuotes  = quotes.filter((q: any) => q.status === 'pending').length

    const pct = (n: number) => counts.total > 0 ? Math.round((n / counts.total) * 100) : 0

    // Store health = % of tickets that are settled (completed / declined /
    // cancelled). 100% means nothing is still open, awaiting a quote, in
    // progress, in snag or awaiting sign-off.
    const settled = counts.completed + counts.declined + counts.cancelled
    const health  = counts.total > 0 ? Math.round((settled / counts.total) * 100) : null

    return { ...s, counts, acceptanceRate, health, acceptedValue, pendingValue, pendingQuotes, pct }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">All Stores</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {storeList.length} store{storeList.length !== 1 ? 's' : ''} under your management
          </p>
        </div>
        <AddStoreForm />
      </div>

      {storeList.length === 0 ? (
        <div className="bg-slate-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center">
          <Building2 size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No stores assigned to you yet.</p>
          <p className="text-xs text-gray-400 mt-1">Contact your administrator to link store accounts.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {storeList.map((store: any) => (
            <Link key={store.id} href={`/regional/stores/${store.id}`}>
              <div className="bg-slate-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-brand-400 dark:hover:border-gray-400 transition-colors">

                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">{store.company_name}</p>
                    <p className="text-sm text-brand-600 dark:text-brand-400 font-medium">{store.sub_store}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {store.health !== null && (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        store.health >= 70
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : store.health >= 40
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {store.health}% health
                      </span>
                    )}
                    <ArrowRight size={16} className="text-gray-400" />
                  </div>
                </div>

                {/* Ticket performance bar */}
                {store.counts.total > 0 ? (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                      <span>Ticket breakdown</span>
                      <span>{store.counts.completed} of {store.counts.total} completed ({store.pct(store.counts.completed)}%)</span>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-700">
                      {store.counts.completed        > 0 && <div className="bg-green-500"  style={{ width: `${store.pct(store.counts.completed)}%` }} />}
                      {store.counts.in_progress      > 0 && <div className="bg-amber-500"  style={{ width: `${store.pct(store.counts.in_progress)}%` }} />}
                      {store.counts.accepted         > 0 && <div className="bg-teal-500"   style={{ width: `${store.pct(store.counts.accepted)}%` }} />}
                      {store.counts.open             > 0 && <div className="bg-blue-500"   style={{ width: `${store.pct(store.counts.open)}%` }} />}
                      {store.counts.quoted           > 0 && <div className="bg-purple-400" style={{ width: `${store.pct(store.counts.quoted)}%` }} />}
                      {store.counts.pending_sign_off > 0 && <div className="bg-orange-400" style={{ width: `${store.pct(store.counts.pending_sign_off)}%` }} />}
                      {store.counts.snag             > 0 && <div className="bg-rose-500"   style={{ width: `${store.pct(store.counts.snag)}%` }} />}
                      {store.counts.declined         > 0 && <div className="bg-red-400"    style={{ width: `${store.pct(store.counts.declined)}%` }} />}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {store.counts.completed        > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500  inline-block" />{store.pct(store.counts.completed)}% done ({store.counts.completed})</span>}
                      {store.counts.in_progress      > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500  inline-block" />{store.pct(store.counts.in_progress)}% in progress ({store.counts.in_progress})</span>}
                      {store.counts.accepted         > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500   inline-block" />{store.pct(store.counts.accepted)}% accepted ({store.counts.accepted})</span>}
                      {store.counts.open             > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500   inline-block" />{store.pct(store.counts.open)}% open ({store.counts.open})</span>}
                      {store.counts.quoted           > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />{store.pct(store.counts.quoted)}% quoted ({store.counts.quoted})</span>}
                      {store.counts.pending_sign_off > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />{store.pct(store.counts.pending_sign_off)}% sign-off ({store.counts.pending_sign_off})</span>}
                      {store.counts.snag             > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500   inline-block" />{store.pct(store.counts.snag)}% snag ({store.counts.snag})</span>}
                      {store.counts.declined         > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400    inline-block" />{store.pct(store.counts.declined)}% declined ({store.counts.declined})</span>}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic mb-4">No tickets yet</p>
                )}

                {/* Bottom stats row */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div>
                    <p className="text-xs text-gray-400">Pending Quotes</p>
                    <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400 mt-0.5">{store.pendingQuotes}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Accepted Value</p>
                    <p className="text-xs font-bold text-green-600 dark:text-green-400 mt-0.5 leading-snug">{formatCurrency(store.acceptedValue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Pending Value</p>
                    <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-0.5 leading-snug">{formatCurrency(store.pendingValue)}</p>
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

