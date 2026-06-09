import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, Building2, ArrowRight, SearchX } from 'lucide-react'
import { SearchInput } from '@/components/ui/SearchInput'
import { Suspense } from 'react'

export default async function AdminRegionalPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const adminClient = createAdminClient()
  const q = (searchParams.q ?? '').toLowerCase().trim()

  const { data: regionalManagers } = await adminClient
    .from('profiles')
    .select('id, full_name, company_name, email, phone')
    .eq('role', 'regional_manager')
    .order('full_name')

  const { data: stores } = await adminClient
    .from('profiles')
    .select('id, regional_manager_id')
    .in('role', ['store_manager', 'client'])

  // Count branches per RM
  const branchCounts: Record<string, number> = {}
  for (const s of stores ?? []) {
    if (s.regional_manager_id) {
      branchCounts[s.regional_manager_id] = (branchCounts[s.regional_manager_id] ?? 0) + 1
    }
  }

  const filtered = q
    ? (regionalManagers ?? []).filter(rm =>
        rm.full_name?.toLowerCase().includes(q) ||
        rm.email?.toLowerCase().includes(q) ||
        rm.company_name?.toLowerCase().includes(q)
      )
    : (regionalManagers ?? [])

  const totalBranches = stores?.length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Clients</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {regionalManagers?.length ?? 0} regional manager{regionalManagers?.length !== 1 ? 's' : ''} · {totalBranches} branch{totalBranches !== 1 ? 'es' : ''} total
        </p>
      </div>

      <Suspense>
        <SearchInput placeholder="Search by name, company or email…" />
      </Suspense>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center">
          {q ? (
            <>
              <SearchX size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 text-sm">No results for &quot;{q}&quot;</p>
            </>
          ) : (
            <>
              <Users size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 text-sm">No regional managers registered yet.</p>
              <p className="text-xs text-gray-400 mt-1">They can sign up at /auth/signup and select the Regional Manager role.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(rm => {
            const count = branchCounts[rm.id] ?? 0
            return (
              <Link key={rm.id} href={`/admin/regional/${rm.id}`}>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 border-l-brand-500 rounded-xl px-5 py-4 hover:border-brand-300 dark:hover:border-brand-600 transition-colors flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                    <span className="text-brand-700 dark:text-brand-400 font-bold text-sm">
                      {(rm.full_name ?? rm.email ?? '?')[0].toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{rm.full_name ?? 'Unnamed'}</p>
                    {rm.company_name && (
                      <p className="text-sm text-brand-600 dark:text-brand-400 truncate">{rm.company_name}</p>
                    )}
                    {rm.email && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{rm.email}</p>
                    )}
                  </div>

                  {/* Branch count + arrow */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{count}</p>
                      <p className="text-xs text-gray-400">branch{count !== 1 ? 'es' : ''}</p>
                    </div>
                    <Building2 size={16} className="text-gray-300 dark:text-gray-600" />
                    <ArrowRight size={16} className="text-gray-400" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
