import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/quotes — admin or regional manager sends a quote
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Allow admin or regional_manager
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'
  const isRM    = profile?.role === 'regional_manager'
  if (!isAdmin && !isRM) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { ticket_id, amount, description, valid_until, file_url } = body

  const adminClient = createAdminClient()

  // Regional managers may only quote tickets from their assigned stores
  if (isRM) {
    const { data: ticket } = await adminClient
      .from('tickets')
      .select('client_id, profiles!tickets_client_id_fkey(regional_manager_id)')
      .eq('id', ticket_id)
      .single()
    const rmId = (ticket?.profiles as any)?.regional_manager_id
    if (rmId !== user.id) {
      return NextResponse.json({ error: 'You can only quote tickets from stores in your region.' }, { status: 403 })
    }
  }

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
    await adminClient.from('notifications').insert({
      user_id: ticket.client_id,
      type: 'new_quote',
      title: 'Quote Received',
      message: `You have received a quote of R${amount} for your ticket: "${ticket.title}"`,
      link: `/client/tickets/${ticket_id}`,
    })
  }

  return NextResponse.json({ quote }, { status: 201 })
}
