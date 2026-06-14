export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, ClipboardList, Wrench, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, formatDateTime, clientVisibleStatus } from '@/lib/utils'
import type { Ticket as TicketType } from '@/lib/types'

export default async function ClientDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: rawTickets }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, company_name, sub_store, branch_code')
      .eq('id', user!.id)
      .single(),
    supabase
      .from('tickets')
      .select('id, title, status, priority, created_at')
      .eq('client_id', user!.id)
      .order('created_at', { ascending: false }),
  ])

  // Collapse every in-flight status to Open → In Progress → Completed so a
  // quoted ticket never vanishes from the store manager's view.
  const visible = (rawTickets ?? [])
    .map(t => ({ ...t, status: clientVisibleStatus(t.status) }))
    .filter((t): t is typeof t & { status: 'open' | 'in_progress' | 'completed' } => t.status !== null)

  const tickets = visible.slice(0, 5)

  const open   = visible.filter(t => t.status === 'open').length
  const active = visible.filter(t => t.status === 'in_progress').length
  const done   = visible.filter(t => t.status === 'completed').length

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Hi, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {profile?.company_name} — {profile?.sub_store}
            {profile?.branch_code && (
              <span className="ml-2 font-mono text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">
                {profile.branch_code}
              </span>
            )}
          </p>
        </div>
        <Link href="/client/tickets/new">
          <Button size="sm">
            <Plus size={16} className="mr-1" /> New Ticket
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Open',        value: open,   icon: ClipboardList, accent: 'border-l-blue-500',  iconCls: 'text-blue-600 dark:text-blue-400',   href: '/client/tickets?status=open'        },
          { label: 'In Progress', value: active, icon: Wrench,        accent: 'border-l-amber-500', iconCls: 'text-amber-600 dark:text-amber-400', href: '/client/tickets?status=in_progress' },
          { label: 'Completed',   value: done,   icon: CheckCircle2,  accent: 'border-l-green-500', iconCls: 'text-green-600 dark:text-green-400', href: '/client/tickets?status=completed'   },
        ].map(stat => (
          <Link key={stat.label} href={stat.href} className="hover:opacity-80 transition-opacity">
            <div className={`bg-slate-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 ${stat.accent} p-3 flex flex-col items-center justify-center text-center gap-1.5 h-full`}>
              <stat.icon size={18} className={stat.iconCls} />
              <p className="text-xl font-bold text-gray-900 dark:text-white leading-none">{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent tickets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">Recent Tickets</h2>
          <Link href="/client/tickets" className="text-sm text-brand-600 hover:underline">View all</Link>
        </div>

        {!tickets?.length ? (
          <div className="bg-slate-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-10 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">No tickets yet.</p>
            <Link href="/client/tickets/new">
              <Button variant="secondary" size="sm">Submit your first ticket</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {(tickets as TicketType[]).map(ticket => (
              <Link key={ticket.id} href={`/client/tickets/${ticket.id}`}>
                <div className="bg-slate-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 hover:border-brand-400 dark:hover:border-gray-400 transition-colors flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{ticket.title}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Created: {formatDateTime(ticket.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={PRIORITY_COLORS[ticket.priority]}>
                      {PRIORITY_LABELS[ticket.priority]}
                    </Badge>
                    <Badge className={STATUS_COLORS[ticket.status]}>
                      {STATUS_LABELS[ticket.status]}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
