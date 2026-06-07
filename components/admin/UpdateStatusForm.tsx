'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import type { TicketStatus } from '@/lib/types'

// Available status transitions per current status
const STATUS_OPTIONS: Record<string, { value: TicketStatus; label: string; color: string }[]> = {
  accepted: [
    { value: 'in_progress', label: 'Mark In Progress', color: 'amber' },
    { value: 'cancelled',   label: 'Cancel Ticket',    color: 'gray'  },
  ],
  in_progress: [
    { value: 'cancelled', label: 'Cancel Ticket', color: 'gray' },
  ],
  snag: [
    { value: 'in_progress', label: 'Revert to In Progress', color: 'amber' },
  ],
}

const COLOR_CLASSES: Record<string, string> = {
  amber: 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700',
  gray:  'border-gray-300 text-gray-500 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600',
}

export function UpdateStatusForm({ ticketId, currentStatus }: { ticketId: string; currentStatus: TicketStatus }) {
  const router  = useRouter()
  const options = STATUS_OPTIONS[currentStatus] ?? []
  const [selected, setSelected] = useState<TicketStatus | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function save() {
    if (!selected || selected === currentStatus) return
    setLoading(true)
    setError('')
    const res = await fetch(`/api/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: selected }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Failed to update status')
      setLoading(false)
      return
    }
    router.refresh()
    setLoading(false)
  }

  if (options.length === 0) return null

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Update Status</p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSelected(prev => prev === opt.value ? null : opt.value)}
            className={[
              'py-1.5 px-3 rounded-lg text-xs font-medium border transition-all',
              COLOR_CLASSES[opt.color],
              selected === opt.value ? 'ring-2 ring-offset-1 ring-brand-500' : 'opacity-80 hover:opacity-100',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {selected && selected !== currentStatus && (
        <Button onClick={save} loading={loading} size="sm" className="w-full">
          Confirm — {options.find(o => o.value === selected)?.label}
        </Button>
      )}
    </div>
  )
}
