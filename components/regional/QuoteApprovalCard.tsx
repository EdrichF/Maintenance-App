'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { FileText, CheckCircle, XCircle, RotateCcw, AlertTriangle } from 'lucide-react'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import type { Quote } from '@/lib/types'

interface Props {
  quote: Quote
  ticketTitle: string
  ticketId: string
}

const DECLINE_REASONS = [
  'Quote too high',
  'Already attended to',
  'Future attendance',
  'Other (specify)',
] as const

export function QuoteApprovalCard({ quote, ticketTitle, ticketId }: Props) {
  const router = useRouter()
  const [loading,       setLoading]       = useState<'accept' | 'decline' | 'revert' | null>(null)
  const [confirming,    setConfirming]     = useState(false)
  const [selectedReason, setSelectedReason] = useState<string>('')
  const [otherReason,    setOtherReason]    = useState('')
  const [reasonError,    setReasonError]    = useState('')

  async function respond(status: 'accepted' | 'declined' | 'pending') {
    if (status === 'declined') {
      const reason = selectedReason === 'Other (specify)' ? otherReason.trim() : selectedReason
      if (!reason) { setReasonError('Please select a reason.'); return }
      if (selectedReason === 'Other (specify)' && !otherReason.trim()) {
        setReasonError('Please specify your reason.'); return
      }
      setLoading('decline')
      await fetch(`/api/quotes/${quote.id}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'declined', decline_reason: reason }),
      })
    } else {
      setLoading(status === 'accepted' ? 'accept' : 'revert')
      await fetch(`/api/quotes/${quote.id}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    }
    setLoading(null)
    setConfirming(false)
    setSelectedReason('')
    setOtherReason('')
    setReasonError('')
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
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{ticketTitle}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(quote.amount)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(quote.created_at)}</p>
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
      {(quote as any).decline_reason && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Decline reason: {(quote as any).decline_reason}
        </p>
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

      {/* Decline — reason + confirmation */}
      {quote.status === 'pending' && confirming && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
            <AlertTriangle size={15} /> Please select a reason for declining
          </div>

          <div className="space-y-1.5">
            {DECLINE_REASONS.map(r => (
              <label key={r} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="decline_reason"
                  value={r}
                  checked={selectedReason === r}
                  onChange={() => { setSelectedReason(r); setReasonError('') }}
                  className="accent-red-600"
                />
                <span className="text-sm text-red-700 dark:text-red-300">{r}</span>
              </label>
            ))}
          </div>

          {selectedReason === 'Other (specify)' && (
            <input
              value={otherReason}
              onChange={e => { setOtherReason(e.target.value); setReasonError('') }}
              placeholder="Specify your reason…"
              className="w-full px-3 py-1.5 border border-red-300 dark:border-red-700 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          )}

          {reasonError && (
            <p className="text-xs text-red-600 dark:text-red-400">{reasonError}</p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => respond('declined')}
              loading={loading === 'decline'}
              variant="danger"
              size="sm"
              className="flex-1"
            >
              Confirm Decline
            </Button>
            <Button
              onClick={() => { setConfirming(false); setSelectedReason(''); setOtherReason(''); setReasonError('') }}
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

      {/* Declined — show revert option */}
      {quote.status === 'declined' && (
        <Button
          onClick={() => respond('accepted')}
          loading={loading === 'revert'}
          variant="secondary"
          size="sm"
          className="w-full"
        >
          <RotateCcw size={13} className="mr-1.5" /> Revert to Accepted
        </Button>
      )}
    </div>
  )
}
