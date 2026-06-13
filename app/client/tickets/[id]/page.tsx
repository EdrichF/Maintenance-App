export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { BackButton } from '@/components/ui/BackButton'
import { Clock, CheckCircle, FileText, XCircle, AlertTriangle, ClipboardCheck, Loader2 } from 'lucide-react'
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

// Statuses where the linear progress tracker does not apply
const OFFTRACK_STATUSES = ['completed', 'cancelled', 'declined', 'pending_sign_off', 'snag', 'snag_in_progress', 'variation_pending']

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
  const isEditable  = t.status === 'open'
  const showTracker = !OFFTRACK_STATUSES.includes(t.status)
  const currentStep = STATUS_STEPS.findIndex(s => s.key === t.status)

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <BackButton />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{t.title}</h1>
      </div>

      {/* Progress tracker — only for the linear happy-path statuses */}
      {showTracker && (
        <div className="bg-slate-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
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
      <div className="bg-slate-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-4">
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
                  <Image
                    src={url}
                    alt=""
                    width={300}
                    height={300}
                    sizes="(max-width: 512px) 33vw, 170px"
                    className="aspect-square object-cover rounded-lg w-full"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status-specific banners */}
      {(t.status === 'quoted' || t.status === 'accepted') && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center gap-3">
          <Loader2 size={18} className="text-blue-500 shrink-0 animate-spin" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Being processed</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Your ticket is being processed. You will be notified once work begins.</p>
          </div>
        </div>
      )}

      {t.status === 'in_progress' && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-3">
          <Clock size={18} className="text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Work in progress</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">The maintenance team is currently working on your ticket.</p>
          </div>
        </div>
      )}

      {t.status === 'variation_pending' && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-3">
          <Clock size={18} className="text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Work in progress</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">An update to the scope of work is being reviewed by the regional manager. Work will continue shortly.</p>
          </div>
        </div>
      )}

      {t.status === 'pending_sign_off' && (
        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-xl p-4 flex items-center gap-3">
          <ClipboardCheck size={18} className="text-orange-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-800 dark:text-orange-300">Awaiting sign-off</p>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">Work is complete and submitted for regional manager sign-off.</p>
          </div>
        </div>
      )}

      {t.status === 'snag' && (
        <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-rose-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-rose-800 dark:text-rose-300">Snag — rework required</p>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">The regional manager flagged an issue with the completed work. The team will address it shortly.</p>
          </div>
        </div>
      )}

      {t.status === 'snag_in_progress' && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Snag — In Progress</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">The team is actively working on resolving the snag. A new sign-off will follow.</p>
          </div>
        </div>
      )}

      {t.status === 'completed' && (
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={18} className="text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">All done!</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">This ticket has been completed and signed off by the regional manager.</p>
          </div>
        </div>
      )}

      {t.status === 'declined' && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
          <XCircle size={18} className="text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">Quote declined</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">The quote was declined by the regional manager. A revised quote will be submitted shortly.</p>
          </div>
        </div>
      )}

      {t.status === 'cancelled' && (
        <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-600 rounded-xl p-4 flex items-center gap-3">
          <XCircle size={18} className="text-gray-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Ticket cancelled</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">This ticket has been cancelled. Contact your administrator if you have questions.</p>
          </div>
        </div>
      )}

      {isEditable && <EditTicketForm ticket={t} />}
    </div>
  )
}
