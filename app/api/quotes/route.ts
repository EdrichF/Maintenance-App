import { createClient, createAdminClient } from '@/lib/supabase/server'
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
