'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface QuoteForm {
  amount: number
  description: string
  valid_until: string
}

export function SendQuoteForm({ ticketId }: { ticketId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<QuoteForm>()

  async function onSubmit(values: QuoteForm) {
    setLoading(true)
    setError('')

    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, ticket_id: ticketId, amount: Number(values.amount) }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to send quote')
      setLoading(false)
      return
    }

    reset()
    setOpen(false)
    router.refresh()
    setLoading(false)
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="primary" className="w-full">
        Send Quote to Client
      </Button>
    )
  }

  return (
    <div className="bg-white border border-brand-200 rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-gray-900">Send Quote</h3>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="amount"
          type="number"
          step="0.01"
          label="Amount (R)"
          placeholder="1500.00"
          error={errors.amount?.message}
          {...register('amount', { required: 'Amount is required', min: { value: 1, message: 'Must be > 0' } })}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            rows={3}
            placeholder="Describe what the quote covers..."
            {...register('description', { required: 'Description is required' })}
          />
          {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
        </div>

        <Input
          id="valid_until"
          type="date"
          label="Valid Until (optional)"
          {...register('valid_until')}
        />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        <div className="flex gap-2">
          <Button type="submit" loading={loading} className="flex-1">Send Quote</Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
        </div>
      </form>
    </div>
  )
}
