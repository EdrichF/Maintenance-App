export const dynamic = 'force-dynamic'

import { ShieldAlert } from 'lucide-react'
import { requireExecutive } from '@/lib/dashboards/guard'
import { assembleEstateDashboard } from '@/lib/dashboards/data'
import { RagBadge } from '@/components/dashboards/primitives'
import { formatCurrency } from '@/lib/utils'

export default async function ExecutiveStoresPage() {
  await requireExecutive()
  const data = await assembleEstateDashboard()
  const regionName = new Map(data.regions.map(r => [r.region.regionId, r.regionName]))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldAlert size={20} className="text-red-500" /> Top Risk Stores
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Ranked by composite risk: health, safety/trading, overdue, blockers, repeat defects and pending quote value.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700">
              <th className="py-2 px-2">#</th><th className="px-2">Store</th><th className="px-2">Region</th>
              <th className="px-2">Health</th><th className="px-2">Status</th><th className="px-2">Main risk</th>
              <th className="px-2">Open</th><th className="px-2">Overdue</th><th className="px-2">Approvals</th><th className="px-2">Exposure</th>
            </tr>
          </thead>
          <tbody>
            {data.topRiskStores.map(({ rank, store }) => (
              <tr key={store.storeId} className="border-b border-gray-50 dark:border-gray-700/50 align-top">
                <td className="py-2 px-2 text-gray-400">{rank}</td>
                <td className="px-2 font-medium text-gray-900 dark:text-white">{store.storeName}</td>
                <td className="px-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{regionName.get(store.regionId ?? '') ?? '—'}</td>
                <td className="px-2 font-semibold">{store.finalHealthScore}%</td>
                <td className="px-2"><RagBadge rag={store.finalRag} /></td>
                <td className="px-2 text-xs text-gray-500 dark:text-gray-400 max-w-[220px]">{store.mainIssue}</td>
                <td className="px-2">{store.openTickets}</td>
                <td className="px-2 text-red-600 dark:text-red-400">{store.overdueTickets}</td>
                <td className="px-2">{store.pendingApprovals}</td>
                <td className="px-2 whitespace-nowrap">{formatCurrency(store.costExposure)}</td>
              </tr>
            ))}
            {data.topRiskStores.length === 0 && (
              <tr><td colSpan={10} className="py-6 text-center text-gray-400 text-sm">No stores under stress.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
