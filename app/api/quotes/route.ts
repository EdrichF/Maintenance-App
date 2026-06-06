import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

// POST /api/quotes — admin only
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { ticket_id, amount, description, valid_until, file_url } = body

  if (!valid_until) {
    return NextResponse.json(
      { error: 'Valid Until is required — all quotes must have an expiry date.' },
      { status: 400 }
    )
  }

  const adminClient = createAdminClient()

  const { data: quote, error } = await adminClient
    .from('quotes')
    .insert({ ticket_id, admin_id: user.id, amount, description, valid_until, ...(file_url ? { file_url } : {}) })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update ticket status to 'quoted'
  await adminClient.from('tickets').update({ status: 'quoted' }).eq('id', ticket_id)

  // Get client info to notify them
  const { data: ticket } = await adminClient
    .from('tickets')
    .select('client_id, title')
    .eq('id', ticket_id)
    .single()

  if (ticket) {
    // Notify store manager (without amount)
    await adminClient.from('notifications').insert({
      user_id: ticket.client_id,
      type: 'new_quote',
      title: 'Quote Received',
      message: `A quote has been submitted for your ticket: "${ticket.title}". Please await regional manager approval.`,
      link: `/client/tickets/${ticket_id}`,
    })

    // Notify regional manager to approve the quote
    const { data: storeProfile } = await adminClient
      .from('profiles')
      .select('regional_manager_id')
      .eq('id', ticket.client_id)
      .single()

    if (storeProfile?.regional_manager_id) {
      await adminClient.from('notifications').insert({
        user_id: storeProfile.regional_manager_id,
        type: 'new_quote',
        title: 'Quote Awaiting Your Approval',
        message: `A quote has been submitted for "${ticket.title}" and requires your approval.`,
        link: `/regional/tickets/${ticket_id}`,
      })
    }
  }

  revalidatePath('/client')
  return NextResponse.json({ quote }, { status: 201 })
}
