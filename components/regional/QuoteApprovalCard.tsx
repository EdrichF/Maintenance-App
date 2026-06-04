'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { FileText, CheckCircle, XCircle } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Quote } from '@/lib/types'

interface Props {
  quote: Quote
  ticketTitle: string
  ticketId: string
}

export function QuoteApprovalCard({ quote, ticketTitle, ticketId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null)

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

  const statusColors = {
    pending:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    declined: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  }

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${
      quote.status === 'pending'
        ? 'bg-white dark:bg-gray-800 border-yellow-200 dark:border-yellow-800/40'
        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{ticketTitle}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(quote.amount)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(quote.created_at)}</p>
        </div>
        <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[quote.status]}`}>
          {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
        </span>
      </div>

      {quote.description && (
        <p className="text-sm text-gray-600 dark:text-gray-300">{quote.description}</p>
      )}

      {quote.valid_until && (
        <p className="text-xs text-gray-400">Valid until: {formatDate(quote.valid_until)}</p>
      )}

      {quote.file_url && (
        <a
          href={quote.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:underline"
        >
          <FileText size={13} /> View attachment
        </a>
      )}

      {quote.status === 'pending' && (
        <div className="flex gap-2 pt-1">
          <Button
            onClick={() => respond('accepted')}
            loading={loading === 'accept'}
            size="sm"
            className="flex-1"
          >
            <CheckCircle size={14} className="mr-1.5" />
            Approve
          </Button>
          <Button
            onClick={() => respond('declined')}
            loading={loading === 'decline'}
            variant="danger"
            size="sm"
            className="flex-1"
          >
            <XCircle size={14} className="mr-1.5" />
            Decline
          </Button>
        </div>
      )}
    </div>
  )
}
