import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, CheckCircle, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { EditTicketForm } from '@/components/client/EditTicketForm'
import {
  STATUS_COLORS, STATUS_LABELS,
  PRIORITY_COLORS, PRIORITY_LABELS,
  formatDate,
} from '@/lib/utils'
import type { Ticket } from '@/lib/types'

const STATUS_STEPS = [
  { key: 'open',        label: 'Submitted',   icon: FileText    },
  { key: 'quoted',      label: 'Quote Sent',  icon: Clock       },
  { key: 'accepted',    label: 'Approved',    icon: CheckCircle },
  { key: 'in_progress', label: 'In Progress', icon: Clock       },
  { key: 'completed',   label: 'Completed',   icon: CheckCircle },
]

export default async function ClientTicketDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: ticket } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', params.id)
    .eq('client_id', user!.id)
    .single()

  if (!ticket) notFound()

  const t = ticket as Ticket
  const isClosed  = ['completed', 'cancelled'].includes(t.status)
  const isEditable = t.status === 'open'
  const currentStep = STATUS_STEPS.findIndex(s => s.key === t.status)

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/client/tickets" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{t.title}</h1>
      </div>

      {/* Progress tracker */}
      {!isClosed && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Progress</p>
          <div className="flex items-center">
            {STATUS_STEPS.map((step, i) => {
              const done    = i < currentStep
              const current = i === currentStep
              const last    = i === STATUS_STEPS.length - 1
              return (
                <div key={step.key} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center gap-1 min-w-0">
                    <div className={
                      'w-7 h-7 rounded-full flex items-center justify-center shrink-0 ' +
                      (done    ? 'bg-brand-600 text-white' :
                       current ? 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-900/40' :
                                 'bg-gray-100 dark:bg-gray-700 text-gray-400')
                    }>
                      <step.icon size={13} />
                    </div>
                    <p className={
                      'text-xs text-center leading-tight ' +
                      (current ? 'text-brand-600 dark:text-brand-400 font-semibold' :
                       done    ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400')
                    }>{step.label}</p>
                  </div>
                  {!last && (
                    <div className={
                      'flex-1 h-0.5 mx-1 mb-4 rounded ' +
                      (done ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700')
                    } />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Ticket details */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={STATUS_COLORS[t.status]}>{STATUS_LABELS[t.status]}</Badge>
          <Badge className={PRIORITY_COLORS[t.priority]}>{PRIORITY_LABELS[t.priority]}</Badge>
          <span className="text-xs text-gray-400 ml-auto">{formatDate(t.created_at)}</span>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Description</p>
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{t.description}</p>
        </div>
        {t.photo_urls?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Photos</p>
            <div className="grid grid-cols-3 gap-2">
              {t.photo_urls.map((url: string, i: number) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt="" className="aspect-square object-cover rounded-lg w-full" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quote status notice — no quote details shown to store manager */}
      {t.status === 'quoted' && (
        <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-xl p-4 flex items-center gap-3">
          <Clock size={18} className="text-purple-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-purple-800 dark:text-purple-300">Quote under review</p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">Your regional manager is reviewing the quote. You will be notified once it is approved.</p>
          </div>
        </div>
      )}

      {t.status === 'accepted' && (
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={18} className="text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">Quote approved</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">The quote has been approved and work will begin shortly.</p>
          </div>
        </div>
      )}

      {isEditable && <EditTicketForm ticket={t} />}
    </div>
  )
}
