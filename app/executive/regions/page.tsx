export const dynamic = 'force-dynamic'

import { Map as MapIcon } from 'lucide-react'
import { requireExecutive } from '@/lib/dashboards/guard'
import { assembleEstateDashboard } from '@/lib/dashboards/data'
import { RagBadge } from '@/components/dashboards/primitives'
import { PORTFOLIO_LABELS } from '@/lib/dashboards/constants'
import { formatCurrency } from '@/lib/utils'

export default async function ExecutiveRegionsPage() {
  await requireExecutive()
  const data = await assembleEstateDashboard()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <MapIcon size={20} className="text-brand-600" /> Regional Ranking
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Highest-risk regions first. Portfolio health = average store health − risk penalty.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700">
              <th className="py-2 px-2">#</th><th className="px-2">Region</th><th className="px-2">Health</th><th className="px-2">Status</th>
              <th className="px-2">Stores</th><th className="px-2">Red</th><th className="px-2">Critical</th>
              <th className="px-2">Open</th><th className="px-2">Sup. SLA</th><th className="px-2">Int. SLA</th>
              <th className="px-2">Cost exposure</th><th className="px-2">Executive note</th>
            </tr>
          </thead>
          <tbody>
            {data.regions.map(({ rank, region, regionName }) => (
              <tr key={region.regionId} className="border-b border-gray-50 dark:border-gray-700/50 align-top">
                <td className="py-2 px-2 text-gray-400">{rank}</td>
                <td className="px-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">{regionName}</td>
                <td className="px-2 font-semibold">{region.finalPortfolioHealth}%</td>
                <td className="px-2"><RagBadge rag={region.rag} label={PORTFOLIO_LABELS[region.rag]} /></td>
                <td className="px-2">{region.activeStores}</td>
                <td className="px-2 text-red-600 dark:text-red-400">{region.counts.red}</td>
                <td className="px-2 text-red-800 dark:text-red-300 font-semibold">{region.counts.critical}</td>
                <td className="px-2">{region.openTickets}</td>
                <td className="px-2">{region.supplierSlaBreaches}</td>
                <td className="px-2">{region.internalSlaBreaches}</td>
                <td className="px-2 whitespace-nowrap">{formatCurrency(region.costExposure)}</td>
                <td className="px-2 text-xs text-gray-500 dark:text-gray-400 max-w-[220px]">{region.mainReason}</td>
              </tr>
            ))}
            {data.regions.length === 0 && (
              <tr><td colSpan={12} className="py-6 text-center text-gray-400 text-sm">No active regions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
