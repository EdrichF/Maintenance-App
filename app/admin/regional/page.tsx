import { createClient } from '@/lib/supabase/server'
import { Users, Store, ArrowRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default async function AdminRegionalPage() {
  const supabase = createClient()

  const { data: regionalManagers } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'regional_manager')
    .order('full_name')

  // For each RM, get their store count
  const { data: stores } = await supabase
    .from('profiles')
    .select('id, regional_manager_id, company_name, sub_store')
    .in('role', ['store_manager', 'client'])
    .not('regional_manager_id', 'is', null)

  const rmStoreMap: Record<string, any[]> = {}
  for (const s of stores ?? []) {
    if (!rmStoreMap[s.regional_manager_id]) rmStoreMap[s.regional_manager_id] = []
    rmStoreMap[s.regional_manager_id].push(s)
  }

  // Unassigned stores
  const { data: unassigned } = await supabase
    .from('profiles')
    .select('id, company_name, sub_store')
    .in('role', ['store_manager', 'client'])
    .is('regional_manager_id', null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Regional Managers</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {regionalManagers?.length ?? 0} regional manager{regionalManagers?.length !== 1 ? 's' : ''} · Assign stores via the Stores tab
        </p>
      </div>

      {/* How-to hint */}
      <div className="bg-brand-50 dark:bg-brand-900/10 border border-brand-200 dark:border-brand-800 rounded-xl p-4 text-sm text-brand-800 dark:text-brand-300">
        <strong>To create a regional manager account:</strong> sign up normally, then update the <code className="bg-brand-100 dark:bg-brand-900/30 px-1 rounded">role</code> to <code className="bg-brand-100 dark:bg-brand-900/30 px-1 rounded">regional_manager</code> in the Supabase profiles table. Then assign stores to them in the <strong>Stores</strong> tab.
      </div>

      {!regionalManagers?.length ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center">
          <Users size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">No regional managers yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {regionalManagers.map(rm => {
            const rmStores = rmStoreMap[rm.id] ?? []
            return (
              <div key={rm.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{rm.full_name ?? 'Unnamed'}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{rm.email}</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 px-2.5 py-1 rounded-full">
                    <Store size={12} />
                    {rmStores.length} store{rmStores.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {rmStores.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {rmStores.map((s: any) => (
                      <span key={s.id} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-full">
                        {s.company_name} — {s.sub_store}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Unassigned stores */}
      {(unassigned?.length ?? 0) > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Store size={16} className="text-orange-500" />
            Unassigned Stores ({unassigned!.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {unassigned!.map(s => (
              <span key={s.id} className="text-xs bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 px-2.5 py-1 rounded-full">
                {s.company_name} — {s.sub_store}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Go to the Stores tab to assign these to a regional manager.</p>
        </div>
      )}
    </div>
  )
}
