import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Ticket, Clock, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, formatDate } from '@/lib/utils'
import type { Ticket as TicketType } from '@/lib/types'

export default async function ClientDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('client_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const open   = tickets?.filter(t => ['open', 'quoted'].includes(t.status)).length ?? 0
  const active = tickets?.filter(t => t.status === 'in_progress').length ?? 0
  const done   = tickets?.filter(t => t.status === 'completed').length ?? 0

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
          { label: 'Open',        value: open,   icon: Ticket,      color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
          { label: 'In Progress', value: active, icon: Clock,       color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30' },
          { label: 'Completed',   value: done,   icon: CheckCircle, color: 'text-green-600 bg-green-50 dark:bg-green-900/30' },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col items-center gap-1">
            <div className={`p-2 rounded-full ${stat.color}`}>
              <stat.icon size={18} />
            </div>
            <p className="text-2xl font-bold dark:text-white">{stat.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent tickets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">Recent Tickets</h2>
          <Link href="/client/tickets" className="text-sm text-brand-600 hover:underline">View all</Link>
        </div>

        {!tickets?.length ? (
          <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-10 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">No tickets yet.</p>
            <Link href="/client/tickets/new">
              <Button variant="secondary" size="sm">Submit your first ticket</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {(tickets as TicketType[]).map(ticket => (
              <Link key={ticket.id} href={`/client/tickets/${ticket.id}`}>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 hover:border-brand-300 dark:hover:border-brand-600 transition-colors flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{ticket.title}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(ticket.created_at)}</p>
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
