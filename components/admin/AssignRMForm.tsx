'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface RM {
  id: string
  full_name: string | null
  company_name: string | null
}

interface Props {
  storeId: string
  currentRmId: string | null
  regionalManagers: RM[]
}

export function AssignRMForm({ storeId, currentRmId, regionalManagers }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<string>(currentRmId ?? '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setLoading(true)
    await fetch('/api/admin/assign-rm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, regionalManagerId: selected || null }),
    })
    setSaved(true)
    setLoading(false)
    router.refresh()
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users size={15} className="text-brand-600" />
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Regional Manager Assignment</p>
      </div>

      <select
        value={selected}
        onChange={e => setSelected(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value="">— No regional manager —</option>
        {regionalManagers.map(rm => (
          <option key={rm.id} value={rm.id}>
            {rm.full_name ?? rm.company_name ?? rm.id}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-2">
        <Button
          onClick={save}
          loading={loading}
          disabled={selected === (currentRmId ?? '')}
          size="sm"
        >
          Save Assignment
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <CheckCircle size={14} /> Saved!
          </span>
        )}
      </div>
    </div>
  )
}
