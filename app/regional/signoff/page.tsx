import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { CompletionReviewCard } from '@/components/regional/CompletionReviewCard'
import { ClipboardCheck, Building2 } from 'lucide-react'
import { PRIORITY_COLORS, PRIORITY_LABELS, formatDate } from '@/lib/utils'

export default async function RegionalSignoffPage() {
  const supabase    = createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: rmProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (rmProfile?.role !== 'regional_manager') redirect('/auth/login')

  // Get all stores in this region
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
        .select('*, profiles(company_name, sub_store), completions(*)')
        .in('client_id', storeIds)
        .eq('status', 'pending_sign_off')
        .order('updated_at', { ascending: false })
    : { data: [] }

  const pendingTickets = (tickets ?? []) as any[]

  // Group by store
  const byStore: Record<string, { store: any; tickets: any[] }> = {}
  for (const ticket of pendingTickets) {
    const storeId = ticket.client_id
    if (!byStore[storeId]) {
      byStore[storeId] = { store: storeMap[storeId] ?? ticket.profiles, tickets: [] }
    }
    byStore[storeId].tickets.push(ticket)
  }
  const storeGroups = Object.values(byStore)

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ClipboardCheck size={20} className="text-orange-500" /> Sign-off Queue
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Review COC/POC submissions awaiting your approval — grouped by branch.
        </p>
      </div>

      {storeGroups.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center">
          <ClipboardCheck size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No sign-offs pending — all clear!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {storeGroups.map(({ store, tickets: storeTickets }) => (
            <div key={store?.id ?? 'unknown'} className="space-y-4">
              {/* Branch header */}
              <div className="flex items-center gap-2 pb-1 border-b border-gray-200 dark:border-gray-700">
                <Building2 size={16} className="text-brand-600 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{store?.company_name ?? 'Unknown Store'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{store?.sub_store}</p>
                </div>
                <span className="ml-auto text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded-full font-semibold">
                  {storeTickets.length} pending
                </span>
              </div>

              {/* Tickets in this branch */}
              {storeTickets.map((ticket: any) => {
                const latestCompletion = (ticket.completions ?? [])
                  .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                return (
                  <div key={ticket.id} className="space-y-3 pl-2 border-l-2 border-orange-200 dark:border-orange-800/40">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Link href={`/regional/tickets/${ticket.id}`} className="font-semibold text-gray-900 dark:text-white hover:underline text-sm">
                          {ticket.title}
                        </Link>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(ticket.updated_at)}</p>
                      </div>
                      <Badge className={PRIORITY_COLORS[ticket.priority as keyof typeof PRIORITY_COLORS]}>
                        {PRIORITY_LABELS[ticket.priority as keyof typeof PRIORITY_LABELS]}
                      </Badge>
                    </div>
                    {latestCompletion && (
                      <CompletionReviewCard completion={latestCompletion} />
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
