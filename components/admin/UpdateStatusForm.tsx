'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { STATUS_LABELS } from '@/lib/utils'
import type { TicketStatus } from '@/lib/types'

// Admins manually move tickets to In Progress once work starts, and Completed when done.
// All other status transitions happen automatically (e.g. quote sent → quoted, quote accepted → accepted).
const STATUSES: TicketStatus[] = ['in_progress']

export function UpdateStatusForm({ ticketId, currentStatus }: { ticketId: string; currentStatus: TicketStatus }) {
  const router = useRouter()
  const [status, setStatus] = useState<TicketStatus>(currentStatus)
  const [loading, setLoading] = useState(false)

  async function save() {
    if (status === currentStatus) return
    setLoading(true)
    await fetch(`/api/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Update Status</p>
      <div className="grid grid-cols-2 gap-2">
        {STATUSES.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
              status === s
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-400'
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>
      {status !== currentStatus && (
        <Button onClick={save} loading={loading} size="sm" className="w-full">
          Save Status
        </Button>
      )}
    </div>
  )
}
