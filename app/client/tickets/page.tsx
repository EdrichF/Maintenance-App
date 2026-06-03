import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, formatDate } from '@/lib/utils'
import type { Ticket } from '@/lib/types'

export default async function ClientTicketsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('client_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">My Tickets</h1>
        <Link href="/client/tickets/new">
          <Button size="sm"><Plus size={16} className="mr-1" />New Ticket</Button>
        </Link>
      </div>

      {!tickets?.length ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
          <p className="text-gray-500 text-sm mb-3">You haven't submitted any tickets yet.</p>
          <Link href="/client/tickets/new">
            <Button variant="secondary" size="sm">Submit your first ticket</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {(tickets as Ticket[]).map(ticket => (
            <Link key={ticket.id} href={`/client/tickets/${ticket.id}`}>
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-4 hover:border-brand-300 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{ticket.title}</p>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{ticket.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(ticket.created_at)}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <Badge className={PRIORITY_COLORS[ticket.priority]}>
                      {PRIORITY_LABELS[ticket.priority]}
                    </Badge>
                    <Badge className={STATUS_COLORS[ticket.status]}>
                      {STATUS_LABELS[ticket.status]}
                    </Badge>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
