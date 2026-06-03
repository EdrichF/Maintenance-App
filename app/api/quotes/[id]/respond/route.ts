import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH /api/quotes/[id]/respond — client accepts or declines a quote
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { status } = await request.json() // 'accepted' | 'declined'

  const adminClient = createAdminClient()

  // Verify this quote belongs to the user's ticket
  const { data: quote } = await adminClient
    .from('quotes')
    .select('ticket_id, amount, tickets(client_id, title)')
    .eq('id', params.id)
    .single()

  const ticket = quote?.tickets as any
  if (!quote || ticket?.client_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await adminClient.from('quotes').update({ status }).eq('id', params.id)

  // Update ticket status accordingly
  const ticketStatus = status === 'accepted' ? 'accepted' : 'open'
  await adminClient.from('tickets').update({ status: ticketStatus }).eq('id', quote.ticket_id)

  // Notify admins
  const { data: adminProfiles } = await adminClient
    .from('profiles').select('id').eq('role', 'admin')

  if (adminProfiles?.length) {
    await adminClient.from('notifications').insert(
      adminProfiles.map(admin => ({
        user_id: admin.id,
        type: status === 'accepted' ? 'quote_accepted' : 'quote_declined',
        title: status === 'accepted' ? 'Quote Accepted!' : 'Quote Declined',
        message: `The client has ${status} the quote of R${quote.amount} for "${ticket?.title}"`,
        link: `/admin/tickets/${quote.ticket_id}`,
      }))
    )
  }

  return NextResponse.json({ success: true })
}
