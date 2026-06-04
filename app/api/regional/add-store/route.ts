import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'regional_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { branch_code } = await request.json()
  if (!branch_code?.trim()) {
    return NextResponse.json({ error: 'Branch code is required' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data: store } = await adminClient
    .from('profiles')
    .select('id, company_name, sub_store, regional_manager_id')
    .eq('branch_code', branch_code.trim().toUpperCase())
    .in('role', ['store_manager', 'client'])
    .single()

  if (!store) {
    return NextResponse.json({ error: 'No store found with that branch code.' }, { status: 404 })
  }

  if (store.regional_manager_id && store.regional_manager_id !== user.id) {
    return NextResponse.json({ error: 'This store is already assigned to another regional manager.' }, { status: 409 })
  }

  if (store.regional_manager_id === user.id) {
    return NextResponse.json({ error: 'This store is already in your region.' }, { status: 409 })
  }

  await adminClient
    .from('profiles')
    .update({ regional_manager_id: user.id })
    .eq('id', store.id)

  return NextResponse.json({
    success: true,
    store: { company_name: store.company_name, sub_store: store.sub_store },
  })
}
