import { createClient, createAdminClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { BackButton } from '@/components/ui/BackButton'
import { Building2, Mail, Phone, MapPin, Image as ImageIcon } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import {
  STATUS_COLORS, STATUS_LABELS,
  PRIORITY_COLORS, PRIORITY_LABELS,
  QUOTE_STATUS_LABELS, formatDate, formatCurrency,
} from '@/lib/utils'

export default async function RegionalTicketDetailPage({ params }: { params: { id: string } }) {
  const supabase    = createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: rmProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (rmProfile?.role !== 'regional_manager') redirect('/auth/login')

  // Fetch ticket
  const { data: ticket } = await adminClient
    .from('tickets')
    .select('*, quotes(*)')
    .eq('id', params.id)
    .single()

  if (!ticket) notFound()

  // Verify the ticket belongs to a store in this region
  const { data: store } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', ticket.client_id)
    .eq('regional_manager_id', user.id)
    .single()

  if (!store) notFound()

  const quotes = (ticket.quotes ?? []).sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const hasPendingQuote = quotes.some((q: any) => q.status === 'pending')

  return (
    <div className="max-w-2xl space-y-5">

      {/* Back */}
      <div className="flex items-center gap-3">
        <BackButton />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{ticket.title}</h1>
          <p className="text-sm text-brand-600 dark:text-brand-400">{store.company_name} — {store.sub_store}</p>
        </div>
      </div>

      {/* Status + Priority */}
      <div className="flex gap-2">
        <Badge className={STATUS_COLORS[ticket.status as keyof typeof STATUS_COLORS]}>
          {STATUS_LABELS[ticket.status as keyof typeof STATUS_LABELS]}
        </Badge>
        <Badge className={PRIORITY_COLORS[ticket.priority as keyof typeof PRIORITY_COLORS]}>
          {PRIORITY_LABELS[ticket.priority as keyof typeof PRIORITY_LABELS]}
        </Badge>
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-1 self-center">
          {formatDate(ticket.created_at)}
        </span>
      </div>

      {/* Description */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Description</p>
        <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{ticket.description}</p>
      </div>

      {/* Photos */}
      {ticket.photo_urls?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <ImageIcon size={12} /> Photos ({ticket.photo_urls.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ticket.photo_urls.map((url: string, i: number) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img
                  src={url}
                  alt={`Photo ${i + 1}`}
                  className="w-full aspect-square object-cover rounded-lg border border-gray-200 dark:border-gray-700 hover:opacity-90 transition-opacity"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Store contact */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Store Contact</p>
        {store.full_name && (
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <Building2 size={14} className="text-gray-400" /> {store.full_name}
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
            <MapPin size={14} className="text-gray-400" /> {store.address}
          </div>
        )}
      </div>

      {hasPendingQuote && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
          A quote is currently pending the store manager's response.
        </div>
      )}

      {/* Quote history */}
      {quotes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quote History</p>
          <div className="space-y-3">
            {quotes.map((q: any) => (
              <div key={q.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(q.amount)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(q.created_at)}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
                    q.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    q.status === 'declined' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {QUOTE_STATUS_LABELS[q.status as keyof typeof QUOTE_STATUS_LABELS]}
                  </span>
                </div>
                {q.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">{q.description}</p>
                )}
                {q.valid_until && (
                  <p className="text-xs text-gray-400">Valid until: {formatDate(q.valid_until)}</p>
                )}
                {q.file_url && (
                  <a href={q.file_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:underline">
                    View attachment
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
