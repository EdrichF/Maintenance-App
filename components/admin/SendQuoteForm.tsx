'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, X, FileText, Loader2, Calendar, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

interface QuoteForm {
  amount:      number
  description: string
  valid_until: string
}

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const PRESETS = [
  { label: '7 days',  days: 7  },
  { label: '14 days', days: 14 },
  { label: '1 month', days: 30 },
] as const

export function SendQuoteForm({ ticketId }: { ticketId: string }) {
  const router = useRouter()
  const [open,       setOpen]       = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [file,       setFile]       = useState<File | null>(null)
  const [uploading,  setUploading]  = useState(false)
  const [parsing,     setParsing]     = useState(false)
  const [autofilled,  setAutofilled]  = useState(false)
  const [parseError,  setParseError]  = useState(false)
  const [validNA,     setValidNA]     = useState(false)   // user chose N/A for valid_until

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<QuoteForm>()

  async function onDrop(accepted: File[]) {
    const f = accepted[0]
    if (!f) return
    setFile(f)
    console.log('[parse-quote-pdf] onDrop fired, file:', f.name, f.type)

    const parseable = f.type === 'application/pdf' || f.type.startsWith('image/')
    if (!parseable) return

    setParsing(true)
    setAutofilled(false)
    setParseError(false)

    try {
      const fd = new FormData()
      fd.append('file', f)
      console.log('[parse-quote-pdf] Sending request...')
      const res = await fetch('/api/parse-quote-pdf', { method: 'POST', body: fd })

      if (!res.ok) {
        console.error('[parse-quote-pdf] API error:', res.status, await res.text())
        setParseError(true)
        return
      }
      const data = await res.json() as {
        amount:      number | null
        description: string | null
        valid_until: string | null
      }
      console.log('[parse-quote-pdf] Extracted:', data)

      if (data.amount      !== null) setValue('amount',      data.amount)
      if (data.description !== null) setValue('description', data.description)
      if (data.valid_until !== null) {
        setValue('valid_until', data.valid_until)
        setValidNA(false)
      } else {
        setValue('valid_until', '')
        setValidNA(false)
      }
      if (data.amount !== null || data.description !== null) {
        setAutofilled(true)
      } else {
        setParseError(true)
      }
    } catch (err) {
      console.error('[parse-quote-pdf] fetch error:', err)
      setParseError(true)
    } finally {
      setParsing(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: 10 * 1024 * 1024,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  })

  async function uploadFile(f: File): Promise<string | null> {
    const supabase = createClient()
    const ext  = f.name.split('.').pop()
    const path = `${ticketId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('quote-attachments').upload(path, f, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('quote-attachments').getPublicUrl(path)
    return data.publicUrl
  }

  async function onSubmit(values: QuoteForm) {
    // valid_until is required unless user explicitly chose N/A
    if (!validNA && !values.valid_until) {
      setError('Please select a Valid Until date or choose N/A.')
      return
    }
    if (!file) {
      setError('Please attach the quote document (PDF, Word, or image) before submitting.')
      return
    }
    setLoading(true)
    setError('')

    setUploading(true)
    const fileUrl = await uploadFile(file)
    setUploading(false)
    if (!fileUrl) {
      setError('File upload failed. Check the quote-attachments storage bucket exists.')
      setLoading(false)
      return
    }

    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...values,
        ticket_id:   ticketId,
        amount:      Number(values.amount),
        file_url:    fileUrl,
        valid_until: validNA ? null : values.valid_until,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to send quote')
      setLoading(false)
      return
    }

    reset()
    setFile(null)
    setOpen(false)
    setAutofilled(false)
    setValidNA(false)
    router.refresh()
    setLoading(false)
  }

  function handleClose() {
    setOpen(false)
    setFile(null)
    setAutofilled(false)
    setValidNA(false)
    reset()
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="primary" className="w-full">
        Send Quote to Client
      </Button>
    )
  }

  return (
    <div className="bg-slate-50 dark:bg-gray-800 border border-brand-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-gray-900 dark:text-white">Send Quote</h3>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* File upload — first so PDF parse runs before user edits fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Attachment <span className="text-red-500">*</span>{' '}
            <span className="text-gray-400 font-normal">(PDF, Word, or image, max 10 MB)</span>
          </label>
          {file ? (
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
              <FileText size={18} className="text-brand-600 shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-200 truncate flex-1">{file.name}</span>
              {parsing ? (
                <span className="flex items-center gap-1 text-xs text-brand-600 shrink-0">
                  <Loader2 size={12} className="animate-spin" /> Reading PDF…
                </span>
              ) : (
                <span className="text-xs text-gray-400 shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
              )}
              <button
                type="button"
                onClick={() => { setFile(null); setAutofilled(false); setValidNA(false); setParseError(false) }}
                className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-brand-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <input {...getInputProps()} />
              <UploadCloud size={28} className={`mx-auto mb-2 ${isDragActive ? 'text-brand-500' : 'text-gray-400'}`} />
              {isDragActive ? (
                <p className="text-sm text-brand-600 font-medium">Drop it here…</p>
              ) : (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Drag & drop a file, or <span className="text-brand-600 font-medium">browse</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PDF or photo auto-fills fields · Word also accepted · max 10 MB</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Auto-fill banner */}
        {autofilled && !parsing && (
          <div className="flex items-center gap-2 px-3 py-2 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800/40 rounded-lg">
            <Sparkles size={14} className="text-brand-600 dark:text-brand-400 shrink-0" />
            <p className="text-xs text-brand-700 dark:text-brand-300">
              Fields auto-filled from PDF — please review and adjust if needed.
            </p>
          </div>
        )}

        {/* Parse error banner */}
        {parseError && !parsing && (
          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40 rounded-lg">
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              ⚠️ Could not auto-fill fields from this PDF. Please fill in manually.
            </p>
          </div>
        )}

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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            rows={3}
            placeholder="Describe what the quote covers..."
            {...register('description', { required: 'Description is required' })}
          />
          {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
        </div>

        {/* Valid Until */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Valid Until <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {PRESETS.map(p => {
              const val     = addDays(p.days)
              const isActive = !validNA && watch('valid_until') === val
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => { setValue('valid_until', val); setValidNA(false) }}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-brand-400 dark:hover:border-brand-500'
                  }`}
                >
                  <Calendar size={11} />
                  {p.label}
                </button>
              )
            })}

            {/* N/A option */}
            <button
              type="button"
              onClick={() => { setValidNA(true); setValue('valid_until', '') }}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                validNA
                  ? 'bg-gray-600 text-white border-gray-600'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              N/A
            </button>
          </div>

          {validNA ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">No expiry date — quote has no valid-until.</p>
          ) : watch('valid_until') ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Valid until:{' '}
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {new Date(watch('valid_until') + 'T00:00:00').toLocaleDateString('en-ZA', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </span>
            </p>
          ) : (
            <p className="text-xs text-red-500 mt-2">Required — select an expiry date or choose N/A.</p>
          )}

          <input type="hidden" {...register('valid_until')} />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" loading={loading} className="flex-1" disabled={uploading || parsing}>
            {uploading ? (
              <><Loader2 size={14} className="animate-spin mr-1.5" /> Uploading…</>
            ) : 'Send Quote'}
          </Button>
          <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
