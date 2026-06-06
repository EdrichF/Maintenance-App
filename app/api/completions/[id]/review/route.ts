import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'regional_manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { status, reject_reason } = body

  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Status must be approved or rejected' }, { status: 400 })
  }
  if (status === 'rejected' && !reject_reason?.trim()) {
    return NextResponse.json({ error: 'Reject reason is required' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data: completion } = await adminClient
    .from('completions')
    .select('ticket_id, tickets(title, client_id)')
    .eq('id', params.id)
    .single()

  if (!completion) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await adminClient.from('completions').update({
    status,
    reject_reason: status === 'rejected' ? reject_reason : null,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  }).eq('id', params.id)

  const ticketStatus = status === 'approved' ? 'completed' : 'snag'
  await adminClient.from('tickets').update({ status: ticketStatus }).eq('id', completion.ticket_id)

  const ticket = (completion as any).tickets

  // Notify admins
  const { data: admins } = await adminClient.from('profiles').select('id').eq('role', 'admin')
  if (admins?.length && ticket) {
    await adminClient.from('notifications').insert(
      admins.map((a: any) => ({
        user_id: a.id,
        type: status === 'approved' ? 'sign_off_approved' : 'sign_off_rejected',
        title: status === 'approved' ? 'Sign-off Approved' : 'Sign-off Rejected — Snag',
        message: status === 'approved'
          ? `Regional manager approved the COC/POC for "${ticket.title}". Ticket is now completed.`
          : `Regional manager rejected the COC/POC for "${ticket.title}". Reason: "${reject_reason}". Ticket moved to Snag.`,
        link: `/admin/tickets/${completion.ticket_id}`,
      }))
    )
  }

  return NextResponse.json({ success: true })
}
