import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail, MapPin, Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { SendQuoteForm } from '@/components/admin/SendQuoteForm'
import { UpdateStatusForm } from '@/components/admin/UpdateStatusForm'
import {
  STATUS_COLORS, STATUS_LABELS,
  PRIORITY_COLORS, PRIORITY_LABELS,
  QUOTE_STATUS_LABELS,
  formatDate, formatCurrency,
} from '@/lib/utils'
import type { Ticket, Quote } from '@/lib/types'

export default async function AdminTicketDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: ticket } = await supabase
    .from('tickets')
    .select('*, profiles(*)')
    .eq('id', params.id)
    .single()

  if (!ticket) notFound()

  const { data: quotes } = await supabase
    .from('quotes')
    .select('*')
    .eq('ticket_id', params.id)
    .order('created_at', { ascending: false })

  const client = (ticket as any).profiles

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/tickets" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{ticket.title}</h1>
      </div>

      {/* Status + Priority */}
      <div className="flex gap-2 flex-wrap">
        <Badge className={STATUS_COLORS[(ticket as Ticket).status]}>
          {STATUS_LABELS[(ticket as Ticket).status]}
        </Badge>
        <Badge className={PRIORITY_COLORS[(ticket as Ticket).priority]}>
          {PRIORITY_LABELS[(ticket as Ticket).priority]}
        </Badge>
        <span className="text-xs text-gray-400 ml-auto self-center">{formatDate(ticket.created_at)}</span>
      </div>

      {/* Client info */}
      {client && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Client</p>
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <Building2 size={15} className="text-gray-400" />
            <span className="font-medium">{client.company_name}</span>
            <span className="text-gray-400">·</span>
            <span>{client.sub_store}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <Mail size={15} className="text-gray-400" />
            <a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a>
          </div>
          {client.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <Phone size={15} className="text-gray-400" />
              <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a>
            </div>
          )}
          {client.address && (
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <MapPin size={15} className="text-gray-400" />
              <span>{client.address}</span>
            </div>
          )}
        </div>
      )}

      {/* Ticket description */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Description</p>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{ticket.description}</p>

        {ticket.photo_urls?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Photos</p>
            <div className="grid grid-cols-3 gap-2">
              {ticket.photo_urls.map((url: string, i: number) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt={`Photo ${i + 1}`} className="aspect-square object-cover rounded-lg w-full" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Update status */}
      <UpdateStatusForm ticketId={params.id} currentStatus={(ticket as Ticket).status} />

      {/* Quotes sent */}
      {(quotes?.length ?? 0) > 0 && (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white mb-2">Quotes Sent</p>
          <div className="space-y-2">
            {(quotes as Quote[]).map(q => (
              <div key={q.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold dark:text-white">{formatCurrency(q.amount)}</p>
                  <Badge className={
                    q.status === 'accepted' ? 'bg-green-100 text-green-800' :
                    q.status === 'declined' ? 'bg-gray-100 text-gray-700' :
                    'bg-yellow-100 text-yellow-800'
                  }>
                    {QUOTE_STATUS_LABELS[q.status]}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{q.description}</p>
                {q.valid_until && <p className="text-xs text-gray-400 mt-1">Valid until: {formatDate(q.valid_until)}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send new quote */}
      <SendQuoteForm ticketId={params.id} />
    </div>
  )
}
