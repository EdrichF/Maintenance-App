'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import {
  STATUS_COLORS, STATUS_LABELS,
  PRIORITY_COLORS, PRIORITY_LABELS,
  formatDateTime,
} from '@/lib/utils'

export interface RecentTicket {
  id: string
  title: string
  status: string
  priority: string
  created_at: string
  store?: { company_name?: string | null; sub_store?: string | null }
  quotes?: { status: string; created_at: string }[]
}

function TicketContent({ ticket }: { ticket: RecentTicket }) {
  const latestQuote = (ticket.quotes ?? [])
    .filter(q => q.status !== 'declined')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

  return (
    <>
      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{ticket.title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
        {ticket.store?.company_name} — {ticket.store?.sub_store}
      </p>
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        <Badge className={`text-xs ${PRIORITY_COLORS[ticket.priority as keyof typeof PRIORITY_COLORS]}`}>
          {PRIORITY_LABELS[ticket.priority as keyof typeof PRIORITY_LABELS]}
        </Badge>
        <Badge className={`text-xs ${STATUS_COLORS[ticket.status as keyof typeof STATUS_COLORS]}`}>
          {STATUS_LABELS[ticket.status as keyof typeof STATUS_LABELS]}
        </Badge>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
        Created: {formatDateTime(ticket.created_at)}
        {latestQuote && (
          <span className="ml-2 text-purple-500 dark:text-purple-400">
            · Quoted: {formatDateTime(latestQuote.created_at)}
          </span>
        )}
      </p>
    </>
  )
}

export function RecentTicketsStack({ tickets }: { tickets: RecentTicket[] }) {
  const [expanded, setExpanded] = useState(false)

  if (tickets.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
        No tickets in the last 7 days.
      </p>
    )
  }

  const topTicket = tickets[0]
  // Show up to 3 background layers (even if fewer tickets)
  const layerCount = Math.min(tickets.length - 1, 3)

  const stackBottomSpace = layerCount * 10 + 12 // px to reserve below stack

  return (
    <div>
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="w-full text-left focus:outline-none"
          aria-label="Expand recent tickets"
        >
          {/* Stack wrapper — extra bottom margin gives room for peeking layers */}
          <div className="relative" style={{ marginBottom: `${stackBottomSpace}px` }}>

            {/* Background layers — progressively darker toward the back
                Light mode: layer0=gray-200, layer1=gray-300, layer2=gray-400
                Dark mode:  layer0=gray-600, layer1=gray-500, layer2=gray-400  */}
            {layerCount >= 1 && (
              <div className="absolute inset-0 rounded-xl border border-gray-300 dark:border-gray-500 bg-gray-200 dark:bg-gray-600"
                style={{ transform: 'translateY(10px) scaleX(0.972)', zIndex: 0 }} />
            )}
            {layerCount >= 2 && (
              <div className="absolute inset-0 rounded-xl border border-gray-400 dark:border-gray-400 bg-gray-300 dark:bg-gray-500"
                style={{ transform: 'translateY(20px) scaleX(0.944)', zIndex: 0 }} />
            )}
            {layerCount >= 3 && (
              <div className="absolute inset-0 rounded-xl border border-gray-500 dark:border-gray-300 bg-gray-400 dark:bg-gray-400"
                style={{ transform: 'translateY(30px) scaleX(0.916)', zIndex: 0 }} />
            )}

            {/* Top card */}
            <div
              className="relative bg-slate-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4"
              style={{ zIndex: layerCount + 1 }}
            >
              <TicketContent ticket={topTicket} />

              {/* Footer row */}
              <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} · last 7 days
                </span>
                <span className="text-xs font-medium text-[#C6A35D] flex items-center gap-1">
                  View all <ChevronDown size={11} />
                </span>
              </div>
            </div>
          </div>
        </button>
      ) : (
        /* Expanded — full list */
        <div>
          <div className="space-y-2">
            {tickets.map(ticket => (
              <Link key={ticket.id} href={`/regional/tickets/${ticket.id}`}>
                <div className="bg-slate-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-brand-400 dark:hover:border-gray-400 transition-colors">
                  <TicketContent ticket={ticket} />
                </div>
              </Link>
            ))}
          </div>

          <button
            onClick={() => setExpanded(false)}
            className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center justify-center gap-1 py-2 transition-colors"
          >
            <ChevronUp size={12} /> Collapse
          </button>
        </div>
      )}
    </div>
  )
}
