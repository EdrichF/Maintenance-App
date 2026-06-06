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
    .from('profiles').select('role').eq('id', user.id).single()

  const role = profile?.role ?? ''
  const isStoreManager = role === 'store_manager' || role === 'client'
  const isRM            = role === 'regional_manager'
  const isAdmin         = role === 'admin'

  if (!isStoreManager && !isRM && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { status, decline_reason } = body

  const allowedStatuses = isStoreManager
    ? ['accepted', 'declined']
    : ['accepted', 'declined', 'pending']

  if (!allowedStatuses.includes(status)) {
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

  if (isStoreManager && ticket?.client_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const quoteUpdate: Record<string, unknown> = { status }
  if (status === 'declined' && decline_reason) {
    quoteUpdate.decline_reason = decline_reason
  } else if (status !== 'declined') {
    quoteUpdate.decline_reason = null
  }

  await adminClient.from('quotes').update(quoteUpdate).eq('id', params.id)

  // RM decline → ticket becomes 'declined' so admin knows to act
  // Store manager decline → ticket goes back to 'open' for new quote
  const ticketStatus = status === 'accepted' ? 'accepted'
    : status === 'pending'  ? 'quoted'
    : isRM                  ? 'declined'
    : 'open'
  await adminClient.from('tickets').update({ status: ticketStatus }).eq('id', quote.ticket_id)

  const reasonNote = decline_reason ? ` Reason: "${decline_reason}".` : ''

  if (ticket?.client_id && !isStoreManager) {
    await adminClient.from('notifications').insert({
      user_id: ticket.client_id,
      type:    status === 'accepted' ? 'quote_accepted' : 'quote_declined',
      title:   status === 'accepted' ? 'Quote Approved' : 'Quote Declined',
      message: status === 'accepted'
        ? `Your quote for "${ticket.title}" has been approved and work will proceed.`
        : `The quote for "${ticket.title}" was declined.${reasonNote} A new quote will follow.`,
      link: `/client/tickets/${quote.ticket_id}`,
    })
  }

  const { data: admins } = await adminClient
    .from('profiles').select('id').eq('role', 'admin')

  if (admins?.length) {
    const actorLabel = isRM ? 'Regional manager' : isStoreManager ? 'Store manager' : 'Admin'
    await adminClient.from('notifications').insert(
      admins.map((a: any) => ({
        user_id: a.id,
        type:    status === 'accepted' ? 'quote_accepted' : 'quote_declined',
        title:   status === 'accepted' ? 'Quote Accepted' : 'Quote Declined',
        message: status === 'accepted'
          ? `${actorLabel} accepted the quote of R${quote.amount} for "${ticket?.title}".`
          : `${actorLabel} declined the quote of R${quote.amount} for "${ticket?.title}".${reasonNote}`,
        link: `/admin/tickets/${quote.ticket_id}`,
      }))
    )
  }

  return NextResponse.json({ success: true })
}
