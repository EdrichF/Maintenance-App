import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { CompletionReviewCard } from '@/components/regional/CompletionReviewCard'
import { ClipboardCheck } from 'lucide-react'
import {
  PRIORITY_COLORS, PRIORITY_LABELS,
  formatDate,
} from '@/lib/utils'

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
    .select('id')
    .eq('regional_manager_id', user.id)
    .in('role', ['store_manager', 'client'])

  const storeIds = (stores ?? []).map((s: any) => s.id)

  // Get pending_sign_off tickets in this region with their latest completion
  const { data: tickets } = storeIds.length > 0
    ? await adminClient
        .from('tickets')
        .select('*, profiles(company_name, sub_store), completions(*)')
        .in('client_id', storeIds)
        .eq('status', 'pending_sign_off')
        .order('updated_at', { ascending: false })
    : { data: [] }

  const pendingTickets = (tickets ?? []) as any[]

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ClipboardCheck size={20} className="text-orange-500" /> Sign-off Queue
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Review COC/POC submissions awaiting your approval.
        </p>
      </div>

      {pendingTickets.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center">
          <ClipboardCheck size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No sign-offs pending — all clear!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingTickets.map((ticket: any) => {
            const latestCompletion = (ticket.completions ?? [])
              .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
            return (
              <div key={ticket.id} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Link href={`/regional/tickets/${ticket.id}`} className="font-semibold text-gray-900 dark:text-white hover:underline">
                      {ticket.title}
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {ticket.profiles?.company_name} — {ticket.profiles?.sub_store} · {formatDate(ticket.updated_at)}
                    </p>
                  </div>
                  <Badge className={PRIORITY_COLORS[ticket.priority as keyof typeof PRIORITY_COLORS]}>
                    {PRIORITY_LABELS[ticket.priority as keyof typeof PRIORITY_LABELS]}
                  </Badge>
                </div>
                {latestCompletion && (
                  <CompletionReviewCard completion={latestCompletion} />
                )}
                <div className="border-b border-gray-100 dark:border-gray-800" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
