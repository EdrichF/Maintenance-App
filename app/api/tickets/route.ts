import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

// POST /api/tickets — create a new ticket
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await request.json()
  const { title, description, priority, photo_urls } = body

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({ client_id: user.id, title, description, priority, photo_urls })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify admins via notifications table
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim())
  const adminClient = createAdminClient()

  const { data: adminProfiles } = await adminClient
    .from('profiles')
    .select('id')
    .eq('role', 'admin')

  if (adminProfiles?.length) {
    await adminClient.from('notifications').insert(
      adminProfiles.map(admin => ({
        user_id: admin.id,
        type: 'new_ticket',
        title: 'New Maintenance Ticket',
        message: `A new ${priority} priority ticket has been submitted: "${title}"`,
        link: `/admin/tickets/${ticket.id}`,
      }))
    )
  }

  revalidatePath('/client')
  revalidatePath('/client')
  return NextResponse.json({ ticket }, { status: 201 })
}
