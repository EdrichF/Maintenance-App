import { createAdminClient } from '@/lib/supabase/server'
import { Users, Store, Mail, Phone, MapPin, AlertCircle } from 'lucide-react'

export default async function AdminRegionalPage() {
  const adminClient = createAdminClient()

  const { data: regionalManagers } = await adminClient
    .from('profiles')
    .select('*')
    .eq('role', 'regional_manager')
    .order('full_name')

  const { data: stores } = await adminClient
    .from('profiles')
    .select('id, full_name, company_name, sub_store, email, phone, branch_code, regional_manager_id')
    .in('role', ['store_manager', 'client'])
    .order('company_name')

  const storesByRM: Record<string, any[]> = {}
  const unassigned: any[] = []

  for (const s of stores ?? []) {
    if (s.regional_manager_id) {
      if (!storesByRM[s.regional_manager_id]) storesByRM[s.regional_manager_id] = []
      storesByRM[s.regional_manager_id].push(s)
    } else {
      unassigned.push(s)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Regional Managers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {regionalManagers?.length ?? 0} manager{regionalManagers?.length !== 1 ? 's' : ''} · {stores?.length ?? 0} store{stores?.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
          <Users size={13} /> Roles assigned at registration
        </div>
      </div>

      {!regionalManagers?.length ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center">
          <Users size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">No regional managers registered yet.</p>
          <p className="text-xs text-gray-400 mt-1">They can sign up at /auth/signup and select the Regional Manager role.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(regionalManagers ?? []).map(rm => {
            const rmStores = storesByRM[rm.id] ?? []
            return (
              <div key={rm.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                        <span className="text-brand-700 dark:text-brand-400 font-bold text-sm">
                          {(rm.full_name ?? rm.email ?? '?')[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{rm.full_name ?? 'Unnamed'}</p>
                        {rm.company_name && <p className="text-sm text-brand-600 dark:text-brand-400">{rm.company_name}</p>}
                      </div>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 px-2.5 py-1 rounded-full">
                      <Store size={11} /> {rmStores.length} branch{rmStores.length !== 1 ? 'es' : ''}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {rm.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Mail size={13} className="text-gray-400 shrink-0" />
                        <a href={`mailto:${rm.email}`} className="hover:underline truncate">{rm.email}</a>
                      </div>
                    )}
                    {rm.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Phone size={13} className="text-gray-400 shrink-0" />
                        <a href={`tel:${rm.phone}`} className="hover:underline">{rm.phone}</a>
                      </div>
                    )}
                    {rm.address && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <MapPin size={13} className="text-gray-400 shrink-0" />
                        <span className="truncate">{rm.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {rmStores.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          <th className="text-left px-5 py-2.5 font-medium">Company</th>
                          <th className="text-left px-5 py-2.5 font-medium">Branch</th>
                          <th className="text-left px-5 py-2.5 font-medium">Contact</th>
                          <th className="text-left px-5 py-2.5 font-medium">Branch Code</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {rmStores.map((s: any) => (
                          <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{s.company_name ?? '—'}</td>
                            <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{s.sub_store ?? '—'}</td>
                            <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                              <div className="flex flex-col gap-0.5">
                                {s.full_name && <span>{s.full_name}</span>}
                                {s.email && <a href={`mailto:${s.email}`} className="text-xs text-brand-600 hover:underline">{s.email}</a>}
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              {s.branch_code
                                ? <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{s.branch_code}</span>
                                : <span className="text-xs text-gray-400 italic">Not set</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="px-5 py-4 text-sm text-gray-400 italic">No stores linked yet.</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {unassigned.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-800/40 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-orange-50 dark:bg-orange-900/10 border-b border-orange-100 dark:border-orange-800/30">
            <AlertCircle size={15} className="text-orange-500" />
            <h2 className="font-semibold text-orange-800 dark:text-orange-300 text-sm">Unassigned Stores ({unassigned.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <th className="text-left px-5 py-2.5 font-medium">Company</th>
                  <th className="text-left px-5 py-2.5 font-medium">Branch</th>
                  <th className="text-left px-5 py-2.5 font-medium">Branch Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {unassigned.map((s: any) => (
                  <tr key={s.id}>
                    <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{s.company_name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{s.sub_store ?? '—'}</td>
                    <td className="px-5 py-3">
                      {s.branch_code
                        ? <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{s.branch_code}</span>
                        : <span className="text-xs text-gray-400 italic">Not set</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-5 py-3 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-700">
            These stores have no regional manager — they can link themselves via branch code, or assign in the Stores tab.
          </p>
        </div>
      )}
    </div>
  )
}
