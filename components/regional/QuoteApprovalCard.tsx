'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { FileText, CheckCircle, XCircle, RotateCcw, AlertTriangle } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Quote } from '@/lib/types'

interface Props {
  quote: Quote
  ticketTitle: string
  ticketId: string
}

export function QuoteApprovalCard({ quote, ticketTitle, ticketId }: Props) {
  const router = useRouter()
  const [loading,    setLoading]    = useState<'accept' | 'decline' | 'revert' | null>(null)
  const [confirming, setConfirming] = useState(false)

  async function respond(status: 'accepted' | 'declined' | 'pending') {
    setLoading(
      status === 'accepted' ? 'accept'
      : status === 'declined' ? 'decline'
      : 'revert'
    )
    await fetch(`/api/quotes/${quote.id}/respond`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setLoading(null)
    setConfirming(false)
    router.refresh()
  }

  const statusColors: Record<string, string> = {
    pending:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400',
    accepted: 'bg-green-100  text-green-800  dark:bg-green-950  dark:text-green-400',
    declined: 'bg-red-100    text-red-800    dark:bg-red-950    dark:text-red-400',
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
        <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[quote.status] ?? ''}`}>
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
        <a href={quote.file_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:underline">
          <FileText size={13} /> View attachment
        </a>
      )}

      {/* Pending — approve / decline */}
      {quote.status === 'pending' && !confirming && (
        <div className="flex gap-2 pt-1">
          <Button onClick={() => respond('accepted')} loading={loading === 'accept'} size="sm" className="flex-1">
            <CheckCircle size={14} className="mr-1.5" /> Approve
          </Button>
          <Button onClick={() => setConfirming(true)} variant="danger" size="sm" className="flex-1">
            <XCircle size={14} className="mr-1.5" /> Decline
          </Button>
        </div>
      )}

      {/* Decline confirmation pop-up */}
      {quote.status === 'pending' && confirming && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
            <AlertTriangle size={15} /> Are you sure you want to decline this quote?
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => respond('declined')}
              loading={loading === 'decline'}
              variant="danger"
              size="sm"
              className="flex-1"
            >
              Yes, decline
            </Button>
            <Button
              onClick={() => setConfirming(false)}
              variant="secondary"
              size="sm"
              className="flex-1"
              disabled={loading !== null}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Declined — revert to accepted */}
      {quote.status === 'declined' && (
        <div className="pt-1">
          <Button
            onClick={() => respond('accepted')}
            loading={loading === 'revert'}
            variant="secondary"
            size="sm"
            className="w-full"
          >
            <RotateCcw size={13} className="mr-1.5" /> Revert to Accepted
          </Button>
        </div>
      )}
    </div>
  )
}
