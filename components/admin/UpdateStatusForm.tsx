'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { STATUS_LABELS } from '@/lib/utils'
import type { TicketStatus } from '@/lib/types'

const STATUSES: TicketStatus[] = ['open', 'quoted', 'accepted', 'in_progress', 'completed', 'cancelled']

export function UpdateStatusForm({ ticketId, currentStatus }: { ticketId: string; currentStatus: TicketStatus }) {
  const router = useRouter()
  const [status, setStatus] = useState<TicketStatus>(currentStatus)
  const [loading, setLoading] = useState(false)

  async function save() {
    if (status === currentStatus) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('tickets').update({ status }).eq('id', ticketId)
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Update Status</p>
      <div className="grid grid-cols-3 gap-2">
        {STATUSES.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
              status === s
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
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
