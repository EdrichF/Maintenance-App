import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH /api/tickets/[id] — store manager edits a ticket (only if status = open)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const adminClient = createAdminClient()

  const { data: ticket } = await adminClient
    .from('tickets')
    .select('client_id, status')
    .eq('id', params.id)
    .single()

  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (ticket.client_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (ticket.status !== 'open') return NextResponse.json({ error: 'Can only edit open tickets' }, { status: 400 })

  const { title, description, priority } = await request.json()

  const { data, error } = await adminClient
    .from('tickets')
    .update({ title, description, priority })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ticket: data })
}

// DELETE /api/tickets/[id] — store manager deletes a ticket (only if status = open)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const adminClient = createAdminClient()

  const { data: ticket } = await adminClient
    .from('tickets')
    .select('client_id, status')
    .eq('id', params.id)
    .single()

  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (ticket.client_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (ticket.status !== 'open') return NextResponse.json({ error: 'Can only delete open tickets' }, { status: 400 })

  const { error } = await adminClient
    .from('tickets')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
