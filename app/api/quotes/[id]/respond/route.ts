import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['regional_manager', 'admin'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { status } = await request.json()
  if (!['accepted', 'declined', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data: quote } = await adminClient
    .from('quotes')
    .select('ticket_id, amount, tickets(client_id, title)')
    .eq('id', params.id)
    .single()

  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ticket = quote.tickets as any

  await adminClient.from('quotes').update({ status }).eq('id', params.id)

  // Map quote status to ticket status
  const ticketStatus = status === 'accepted' ? 'accepted'
    : status === 'pending'  ? 'quoted'
    : 'open'
  await adminClient.from('tickets').update({ status: ticketStatus }).eq('id', quote.ticket_id)

  if (ticket?.client_id) {
    await adminClient.from('notifications').insert({
      user_id: ticket.client_id,
      type: status === 'accepted' ? 'quote_accepted' : 'quote_declined',
      title: status === 'accepted' ? 'Quote Approved' : 'Quote Declined',
      message: status === 'accepted'
        ? `Your quote of R${quote.amount} for "${ticket.title}" has been approved.`
        : `The quote for "${ticket.title}" was declined. A new quote will follow.`,
      link: `/client/tickets/${quote.ticket_id}`,
    })
  }

  const { data: admins } = await adminClient
    .from('profiles').select('id').eq('role', 'admin')

  if (admins?.length) {
    await adminClient.from('notifications').insert(
      admins.map((a: any) => ({
        user_id: a.id,
        type: status === 'accepted' ? 'quote_accepted' : 'quote_declined',
        title: status === 'accepted' ? 'Quote Accepted' : 'Quote Declined',
        message: `Regional manager ${status} the quote of R${quote.amount} for "${ticket?.title}"`,
        link: `/admin/tickets/${quote.ticket_id}`,
      }))
    )
  }

  return NextResponse.json({ success: true })
}
