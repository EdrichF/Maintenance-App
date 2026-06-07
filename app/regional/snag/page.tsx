import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { AlertTriangle, Building2 } from 'lucide-react'
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS, formatDateTime } from '@/lib/utils'

export default async function RegionalSnagPage() {
  const supabase    = createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: rmProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
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
        .select('*, completions(id, status, reject_reason, created_at)')
        .in('client_id', storeIds)
        .eq('status', 'snag')
        .order('updated_at', { ascending: false })
    : { data: [] }

  const snagTickets = (tickets ?? []) as any[]

  const byStore: Record<string, { store: any; tickets: any[] }> = {}
  for (const ticket of snagTickets) {
    const storeId = ticket.client_id
    if (!byStore[storeId]) byStore[storeId] = { store: storeMap[storeId], tickets: [] }
    byStore[storeId].tickets.push(ticket)
  }
  const storeGroups = Object.values(byStore)

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <AlertTriangle size={20} className="text-rose-500" /> Snag Tickets
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Tickets where COC/POC was rejected — rework required.
        </p>
      </div>

      {storeGroups.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center">
          <AlertTriangle size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No snag tickets — all clear.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {storeGroups.map(({ store, tickets: storeTickets }) => (
            <div key={store?.id ?? 'unknown'} className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-gray-200 dark:border-gray-700">
                <Building2 size={16} className="text-rose-500 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{store?.company_name ?? 'Unknown Store'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{store?.sub_store}</p>
                </div>
                <span className="ml-auto text-xs bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 px-2 py-0.5 rounded-full font-semibold">
                  {storeTickets.length} snag
                </span>
              </div>
              <div className="space-y-2">
                {storeTickets.map((ticket: any) => {
                  const latestRejection = (ticket.completions ?? [])
                    .filter((c: any) => c.status === 'rejected')
                    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                  return (
                    <Link key={ticket.id} href={`/regional/tickets/${ticket.id}`}>
                      <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/40 rounded-xl px-4 py-3 hover:border-rose-400 dark:hover:border-rose-600 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{ticket.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDateTime(ticket.updated_at)}</p>
                            {latestRejection?.reject_reason && (
                              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium">
                                Rejection: {latestRejection.reject_reason}
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
          ))}
        </div>
      )}
    </div>
  )
}
