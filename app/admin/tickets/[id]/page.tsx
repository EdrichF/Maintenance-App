export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { BackButton } from '@/components/ui/BackButton'
import { Phone, Mail, MapPin, Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { SendQuoteForm } from '@/components/admin/SendQuoteForm'
import { SubmitCompletionForm } from '@/components/admin/SubmitCompletionForm'
import { UpdateStatusForm } from '@/components/admin/UpdateStatusForm'
import {
  STATUS_COLORS, STATUS_LABELS,
  PRIORITY_COLORS, PRIORITY_LABELS,
  QUOTE_STATUS_LABELS,
  formatDate, formatDateTime, formatCurrency,
} from '@/lib/utils'
import type { Ticket, Quote } from '@/lib/types'

export default async function AdminTicketDetailPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient()

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

  const { data: completions } = await supabase
    .from('completions')
    .select('*')
    .eq('ticket_id', params.id)
    .order('created_at', { ascending: false })

  const client = (ticket as any).profiles
  const hasAcceptedQuote = (quotes ?? []).some((q: any) => q.status === 'accepted')
  const ticketStatus = (ticket as Ticket).status
  const canUpdateStatus = (hasAcceptedQuote || ['accepted', 'in_progress', 'snag', 'snag_in_progress'].includes(ticketStatus))
    && !['pending_sign_off', 'completed', 'cancelled'].includes(ticketStatus)

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <BackButton />
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
        <span className="text-xs text-gray-400 ml-auto self-center">{formatDateTime(ticket.created_at)}</span>
      </div>

      {/* Client info */}
      {client && (
        <div className="bg-slate-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2">
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
            <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
              <MapPin size={15} className="text-gray-400 mt-0.5 shrink-0" />
              <a href={`https://maps.google.com/?q=${encodeURIComponent(client.address)}`}
                target="_blank" rel="noopener noreferrer"
                className="hover:underline text-brand-600 dark:text-brand-400">
                {client.address}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Ticket description */}
      <div className="bg-slate-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
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
      {canUpdateStatus ? (
        <UpdateStatusForm ticketId={params.id} currentStatus={ticketStatus} />
      ) : !['pending_sign_off', 'completed', 'cancelled'].includes(ticketStatus) ? (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-xs text-gray-400 text-center">
          Status can be updated once a quote has been accepted.
        </div>
      ) : null}

      {/* Quotes sent */}
      {(quotes?.length ?? 0) > 0 && (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white mb-2">Quotes Sent</p>
          <div className="space-y-2">
            {(quotes as Quote[]).map(q => (
              <div key={q.id} className="bg-slate-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold dark:text-white">{formatCurrency(q.amount)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Sent: {formatDateTime(q.created_at)}</p>
                  </div>
                  <Badge className={
                    q.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                    q.status === 'declined' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }>
                    {QUOTE_STATUS_LABELS[q.status]}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">{q.description}</p>
                {q.valid_until && <p className="text-xs text-gray-400">Valid until: {formatDate(q.valid_until)}</p>}
                {(q as any).decline_reason && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 px-3 py-2">
                    <p className="text-xs font-medium text-red-600 dark:text-red-400">
                      Declined by regional manager — Reason: {(q as any).decline_reason}
                    </p>
                  </div>
                )}
                {(q as any).file_url && (
                  <a href={(q as any).file_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 hover:underline">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    View attached quote
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit for sign-off — shown when in_progress or snag_in_progress */}
      {['in_progress', 'snag_in_progress'].includes(ticketStatus) && (
        <SubmitCompletionForm ticketId={params.id} />
      )}

      {/* Completion history */}
      {(completions?.length ?? 0) > 0 && (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white mb-2">COC/POC History</p>
          <div className="space-y-3">
            {completions!.map((comp: any) => (
              <div key={comp.id} className={`border rounded-xl p-4 space-y-2 ${
                comp.status === 'approved' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/40' :
                comp.status === 'rejected' ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800/40' :
                'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/40'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Submission</p>
                    <p className="text-xs text-gray-400 mt-0.5">Submitted: {formatDateTime(comp.created_at)}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    comp.status === 'approved' ? 'bg-green-100 text-green-700' :
                    comp.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {comp.status === 'approved' ? 'Approved' : comp.status === 'rejected' ? 'Rejected' : 'Pending Sign-off'}
                  </span>
                </div>
                {comp.reject_reason && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">Reason: {comp.reject_reason}</p>
                )}
                {comp.coc_url && (
                  <a href={comp.coc_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:underline">
                    View COC
                  </a>
                )}
                {comp.poc_urls?.length > 0 && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {comp.poc_urls.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                      </a>
                    ))}
                  </div>
                )}
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
