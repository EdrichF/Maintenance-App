import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { QuoteCard } from '@/components/client/QuoteCard'
import {
  STATUS_COLORS, STATUS_LABELS,
  PRIORITY_COLORS, PRIORITY_LABELS,
  formatDate,
} from '@/lib/utils'
import type { Ticket, Quote } from '@/lib/types'

export default async function ClientTicketDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: ticket } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', params.id)
    .eq('client_id', user!.id)
    .single()

  if (!ticket) notFound()

  const { data: quotes } = await supabase
    .from('quotes')
    .select('*')
    .eq('ticket_id', params.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Link href="/client/tickets" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{(ticket as Ticket).title}</h1>
      </div>

      {/* Ticket details */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={STATUS_COLORS[(ticket as Ticket).status]}>
            {STATUS_LABELS[(ticket as Ticket).status]}
          </Badge>
          <Badge className={PRIORITY_COLORS[(ticket as Ticket).priority]}>
            {PRIORITY_LABELS[(ticket as Ticket).priority]}
          </Badge>
          <span className="text-xs text-gray-400 ml-auto">{formatDate(ticket.created_at)}</span>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Description</p>
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{ticket.description}</p>
        </div>

        {/* Photos */}
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

      {/* Quotes */}
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Quotes</h2>
        {!quotes?.length ? (
          <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-400">No quote received yet. We'll notify you when one is ready.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(quotes as Quote[]).map(quote => (
              <QuoteCard key={quote.id} quote={quote} ticketId={params.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
