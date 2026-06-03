'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate, QUOTE_STATUS_LABELS } from '@/lib/utils'
import type { Quote } from '@/lib/types'

interface QuoteCardProps {
  quote: Quote
  ticketId: string
}

export function QuoteCard({ quote, ticketId }: QuoteCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null)

  const statusColors = {
    pending:  'bg-yellow-100 text-yellow-800',
    accepted: 'bg-green-100 text-green-800',
    declined: 'bg-gray-100 text-gray-700',
  }

  async function respond(status: 'accepted' | 'declined') {
    setLoading(status === 'accepted' ? 'accept' : 'decline')
    await fetch(`/api/quotes/${quote.id}/respond`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    router.refresh()
    setLoading(null)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(quote.amount)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(quote.created_at)}</p>
        </div>
        <Badge className={statusColors[quote.status]}>
          {QUOTE_STATUS_LABELS[quote.status]}
        </Badge>
      </div>

      <p className="text-sm text-gray-600">{quote.description}</p>

      {quote.valid_until && (
        <p className="text-xs text-gray-400">Valid until: {formatDate(quote.valid_until)}</p>
      )}

      {/* Action buttons — only show if still pending */}
      {quote.status === 'pending' && (
        <div className="flex gap-2 pt-1">
          <Button
            onClick={() => respond('accepted')}
            loading={loading === 'accept'}
            className="flex-1"
            size="sm"
          >
            Accept Quote
          </Button>
          <Button
            onClick={() => respond('declined')}
            loading={loading === 'decline'}
            variant="danger"
            className="flex-1"
            size="sm"
          >
            Decline
          </Button>
        </div>
      )}
    </div>
  )
}
