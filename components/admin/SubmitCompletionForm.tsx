'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/Button'
import { UploadCloud, X, FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props { ticketId: string }

export function SubmitCompletionForm({ ticketId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')

  // COC file
  const [cocFile, setCocFile] = useState<File | null>(null)
  const onDropCoc = useCallback((files: File[]) => { if (files[0]) setCocFile(files[0]) }, [])
  const { getRootProps: getCocProps, getInputProps: getCocInput, isDragActive: cocDrag } = useDropzone({
    onDrop: onDropCoc, multiple: false, maxSize: 20 * 1024 * 1024,
    accept: { 'application/pdf': ['.pdf'], 'application/msword': ['.doc'],
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
  })

  // POC photos (min 2)
  const [pocFiles, setPocFiles] = useState<File[]>([])
  const [pocPreviews, setPocPreviews] = useState<string[]>([])
  const onDropPoc = useCallback((files: File[]) => {
    const add = files.slice(0, 10 - pocFiles.length)
    setPocFiles(p => [...p, ...add])
    setPocPreviews(p => [...p, ...add.map(f => URL.createObjectURL(f))])
  }, [pocFiles])
  const { getRootProps: getPocProps, getInputProps: getPocInput, isDragActive: pocDrag } = useDropzone({
    onDrop: onDropPoc, accept: { 'image/*': [] }, maxSize: 10 * 1024 * 1024,
    disabled: pocFiles.length >= 10,
  })
  function removePoc(i: number) {
    setPocFiles(p => p.filter((_, idx) => idx !== i))
    setPocPreviews(p => p.filter((_, idx) => idx !== i))
  }

  async function uploadFile(file: File, bucket: string, prefix: string): Promise<string | null> {
    const supabase = createClient()
    const ext  = file.name.split('.').pop()
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) return null
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  async function handleSubmit() {
    if (pocFiles.length < 2) { setError('Please upload at least 2 proof of completion photos.'); return }
    setLoading(true); setError(''); setUploading(true)

    let cocUrl: string | null = null
    if (cocFile) {
      cocUrl = await uploadFile(cocFile, 'completion-docs', `${ticketId}/coc`)
      if (!cocUrl) { setError('COC upload failed.'); setLoading(false); setUploading(false); return }
    }

    const pocUrls: string[] = []
    for (const photo of pocFiles) {
      const url = await uploadFile(photo, 'completion-docs', `${ticketId}/poc`)
      if (!url) { setError('POC upload failed.'); setLoading(false); setUploading(false); return }
      pocUrls.push(url)
    }
    setUploading(false)

    const res = await fetch('/api/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_id: ticketId, coc_url: cocUrl, poc_urls: pocUrls, notes }),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Submission failed')
      setLoading(false); return
    }

    setLoading(false); setOpen(false); setConfirming(false)
    router.refresh()
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="w-full bg-green-600 hover:bg-green-700 text-white">
        <CheckCircle size={15} className="mr-1.5" /> Submit for Sign-off (Job Complete)
      </Button>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded-xl p-5 space-y-5">
      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <CheckCircle size={16} className="text-green-600" /> Submit COC &amp; POC for Sign-off
      </h3>

      {/* COC Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Certificate of Completion (COC) <span className="text-gray-400 font-normal">(PDF or Word, optional)</span>
        </label>
        {cocFile ? (
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
            <FileText size={16} className="text-green-600 shrink-0" />
            <span className="text-sm text-gray-700 dark:text-gray-200 truncate flex-1">{cocFile.name}</span>
            <button type="button" onClick={() => setCocFile(null)} className="text-gray-400 hover:text-red-500">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div {...getCocProps()} className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${cocDrag ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-green-400'}`}>
            <input {...getCocInput()} />
            <UploadCloud size={22} className="mx-auto text-gray-400 mb-1" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{cocDrag ? 'Drop here…' : 'PDF or Word up to 20 MB'}</p>
          </div>
        )}
      </div>

      {/* POC Photos */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Proof of Completion (POC) Photos <span className="text-red-500">*</span>
          <span className="text-gray-400 font-normal ml-1">(minimum 2, up to 10)</span>
        </label>
        {pocPreviews.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            {pocPreviews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removePoc(i)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
        {pocFiles.length > 0 && pocFiles.length < 2 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">Add {2 - pocFiles.length} more photo{2 - pocFiles.length !== 1 ? 's' : ''} — minimum 2 required.</p>
        )}
        {pocFiles.length < 10 && (
          <div {...getPocProps()} className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${pocDrag ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-green-400'}`}>
            <input {...getPocInput()} />
            <UploadCloud size={22} className="mx-auto text-gray-400 mb-1" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{pocDrag ? 'Drop photos…' : 'Tap to add photos (PNG, JPG, up to 10 MB)'}</p>
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Any notes for the regional manager…"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
        />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Confirm step */}
      {!confirming ? (
        <div className="flex gap-2">
          <Button onClick={() => { if (pocFiles.length < 2) { setError('Please upload at least 2 POC photos.'); return } setConfirming(true) }} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
            Review & Submit
          </Button>
          <Button variant="secondary" onClick={() => { setOpen(false); setError('') }} className="flex-1">Cancel</Button>
        </div>
      ) : (
        <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 space-y-3">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            Confirm submission? This will mark the ticket as <strong>Pending Sign-off</strong> and notify the regional manager.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleSubmit} loading={loading} className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={uploading}>
              {uploading ? <><Loader2 size={14} className="animate-spin mr-1.5" />Uploading…</> : 'Yes, Submit'}
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)} className="flex-1" disabled={loading}>Back</Button>
          </div>
        </div>
      )}
    </div>
  )
}
