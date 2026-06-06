import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { ticket_id, coc_url, poc_urls, notes } = body

  if (!ticket_id) return NextResponse.json({ error: 'ticket_id required' }, { status: 400 })
  if (!poc_urls || poc_urls.length < 2) {
    return NextResponse.json({ error: 'At least 2 proof of completion photos required' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data: completion, error } = await adminClient
    .from('completions')
    .insert({ ticket_id, admin_id: user.id, coc_url: coc_url || null, poc_urls, notes: notes || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await adminClient.from('tickets').update({ status: 'pending_sign_off' }).eq('id', ticket_id)

  const { data: ticket } = await adminClient
    .from('tickets').select('title, client_id').eq('id', ticket_id).single()

  if (ticket) {
    const { data: storeProfile } = await adminClient
      .from('profiles').select('regional_manager_id').eq('id', ticket.client_id).single()

    if (storeProfile?.regional_manager_id) {
      await adminClient.from('notifications').insert({
        user_id: storeProfile.regional_manager_id,
        type: 'sign_off_request',
        title: 'Sign-off Required',
        message: `COC/POC submitted for "${ticket.title}". Please review and sign off.`,
        link: `/regional/tickets/${ticket_id}`,
      })
    }

    // Also notify store manager
    await adminClient.from('notifications').insert({
      user_id: ticket.client_id,
      type: 'sign_off_request',
      title: 'Job Submitted for Sign-off',
      message: `Work on "${ticket.title}" has been completed and submitted for regional sign-off.`,
      link: `/client/tickets/${ticket_id}`,
    })
  }

  return NextResponse.json({ completion }, { status: 201 })
}
