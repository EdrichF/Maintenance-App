import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Store, ArrowRight, Phone, Mail, MapPin } from 'lucide-react'
import { formatDate, formatCurrency, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils'
import { AddStoreForm } from '@/components/regional/AddStoreForm'

export default async function RegionalStoresPage() {
  const supabase    = createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: stores } = await adminClient
    .from('profiles')
    .select(`
      id, full_name, company_name, sub_store, email, phone, address,
      tickets(id, status, priority, created_at, quotes(id, amount, status))
    `)
    .eq('regional_manager_id', user.id)
    .in('role', ['store_manager', 'client'])
    .order('company_name')

  const storeList = (stores ?? []).map((s: any) => {
    const tickets = s.tickets ?? []
    const quotes  = tickets.flatMap((t: any) => t.quotes ?? [])
    return {
      ...s,
      openCount:      tickets.filter((t: any) => ['open','quoted','accepted','in_progress'].includes(t.status)).length,
      completedCount: tickets.filter((t: any) => t.status === 'completed').length,
      totalTickets:   tickets.length,
      pendingQuotes:  quotes.filter((q: any) => q.status === 'pending').length,
      totalValue:     quotes.filter((q: any) => q.status === 'accepted').reduce((s: number, q: any) => s + (q.amount ?? 0), 0),
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">All Stores</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{storeList.length} store{storeList.length !== 1 ? 's' : ''} under your management</p>
          </div>
          <AddStoreForm />
        </div>
      </div>

      {storeList.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center">
          <Store size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No stores assigned to you yet.</p>
          <p className="text-xs text-gray-400 mt-1">Contact your administrator to link store accounts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {storeList.map((store: any) => (
            <Link key={store.id} href={`/regional/stores/${store.id}`}>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-brand-300 dark:hover:border-brand-600 transition-colors h-full">
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">{store.company_name}</p>
                    <p className="text-sm text-brand-600 dark:text-brand-400 font-medium">{store.sub_store}</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-400 shrink-0 mt-1" />
                </div>

                {/* Contact info */}
                <div className="space-y-1.5 mb-4">
                  {store.email && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Mail size={12} className="shrink-0" />
                      <span className="truncate">{store.email}</span>
                    </div>
                  )}
                  {store.phone && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Phone size={12} className="shrink-0" />
                      <span>{store.phone}</span>
                    </div>
                  )}
                  {store.address && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <MapPin size={12} className="shrink-0" />
                      <span className="truncate">{store.address}</span>
                    </div>
                  )}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{store.openCount}</p>
                    <p className="text-xs text-gray-400">Open</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{store.completedCount}</p>
                    <p className="text-xs text-gray-400">Done</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-yellow-600">{store.pendingQuotes}</p>
                    <p className="text-xs text-gray-400">Quotes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-green-600 dark:text-green-400 leading-tight">{formatCurrency(store.totalValue)}</p>
                    <p className="text-xs text-gray-400">Value</p>
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
