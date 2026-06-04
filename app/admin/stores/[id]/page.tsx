import { createClient, createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, MapPin, Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { AssignRMForm } from '@/components/admin/AssignRMForm'
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, formatDate } from '@/lib/utils'
import type { Ticket } from '@/lib/types'

export default async function AdminStoreDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: store } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .in('role', ['store_manager', 'client'])
    .single()

  if (!store) notFound()

  const { data: tickets } = await supabase
    .from('tickets')
    .select('*, quotes(id, amount, status)')
    .eq('client_id', params.id)
    .order('created_at', { ascending: false })

  const { data: regionalManagers } = await supabase
    .from('profiles')
    .select('id, full_name, company_name')
    .eq('role', 'regional_manager')
    .order('full_name')

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/stores" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{store.company_name}</h1>
          <p className="text-sm text-brand-600 dark:text-brand-400">{store.sub_store}</p>
        </div>
      </div>

      {/* Store info */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Store Info</p>
        {store.full_name && (
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <Building2 size={14} className="text-gray-400" />
            <span>{store.full_name}</span>
          </div>
        )}
        {store.email && (
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <Mail size={14} className="text-gray-400" />
            <a href={`mailto:${store.email}`} className="hover:underline">{store.email}</a>
          </div>
        )}
        {store.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <Phone size={14} className="text-gray-400" />
            <a href={`tel:${store.phone}`} className="hover:underline">{store.phone}</a>
          </div>
        )}
        {store.address && (
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <MapPin size={14} className="text-gray-400" />
            <span>{store.address}</span>
          </div>
        )}
      </div>

      {/* Assign Regional Manager */}
      <AssignRMForm
        storeId={store.id}
        currentRmId={store.regional_manager_id}
        regionalManagers={regionalManagers ?? []}
      />

      {/* Tickets */}
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">
          Tickets ({tickets?.length ?? 0})
        </h2>
        {!tickets?.length ? (
          <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-400">No tickets from this store yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(tickets as Ticket[]).map(ticket => (
              <Link key={ticket.id} href={`/admin/tickets/${ticket.id}`}>
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
    </div>
  )
}
