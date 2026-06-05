import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Use admin client so RLS never silently filters the read
  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ profile })
}

export async function PATCH(request: Request) {
  // Verify identity with the anon client (session-based)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await request.json()
  const { full_name, phone, address, company_name, sub_store, branch_code, role } = body

  const updateData: Record<string, unknown> = {
    full_name, phone, address, company_name, sub_store,
  }
  // Allow role to be set on first signup (store_manager / regional_manager only — never admin)
  if (role === 'store_manager' || role === 'regional_manager') {
    updateData.role = role
  }
  // Normalise branch_code to uppercase; clear when empty
  if (branch_code?.trim()) {
    updateData.branch_code = branch_code.trim().toUpperCase()
  } else if (branch_code === '' || branch_code === null) {
    updateData.branch_code = null
  }

  // Use the admin client for the write so RLS policies on the profiles table
  // never silently swallow the update (a known Supabase gotcha when the UPDATE
  // policy has no WITH CHECK clause). The user.id guard above ensures users can
  // only ever modify their own row.
  const adminClient = createAdminClient()
  const { data: profile, error } = await adminClient
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile })
}
