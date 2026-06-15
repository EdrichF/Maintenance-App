export const dynamic = 'force-dynamic'

import { Gavel, Repeat } from 'lucide-react'
import { requireExecutive } from '@/lib/dashboards/guard'
import { assembleEstateDashboard } from '@/lib/dashboards/data'
import { DECISION_CHIP } from '@/components/dashboards/decisionChip'

export default async function ExecutiveDecisionsPage() {
  await requireExecutive()
  const data = await assembleEstateDashboard()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Gavel size={20} className="text-indigo-500" /> Executive Decisions Required
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Exception-based. Each item names the reason, impact, recommended action, owner and deadline.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700">
              <th className="py-2 px-2">Decision</th><th className="px-2">Reason</th><th className="px-2">Value / impact</th>
              <th className="px-2">Recommended action</th><th className="px-2">Owner</th><th className="px-2">Due</th>
            </tr>
          </thead>
          <tbody>
            {data.decisions.map((d, i) => (
              <tr key={i} className="border-b border-gray-50 dark:border-gray-700/50 align-top">
                <td className="py-2 px-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DECISION_CHIP[d.category]}`}>{d.category}</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{d.decisionRequired}</p>
                </td>
                <td className="px-2 text-xs text-gray-500 dark:text-gray-400 max-w-[240px]">{d.reason}</td>
                <td className="px-2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">{d.value}</td>
                <td className="px-2 text-xs text-gray-500 dark:text-gray-400 max-w-[220px]">{d.recommendedAction}</td>
                <td className="px-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{d.owner}</td>
                <td className="px-2 text-xs whitespace-nowrap">{d.deadlineDays}d</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Repeat defect & root-cause analysis */}
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
          <Repeat size={16} className="text-pink-500" /> Repeat Defect & Root-Cause Analysis
        </h2>
        {data.repeatDefects.length === 0 ? (
          <p className="text-sm text-gray-400">No repeat-defect patterns detected in the last 30 days.</p>
        ) : (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="py-2 px-2">Category</th><th className="px-2">Store</th><th className="px-2">Region</th>
                  <th className="px-2">Repeats</th><th className="px-2">Likely cause</th><th className="px-2">Suggested action</th>
                </tr>
              </thead>
              <tbody>
                {data.repeatDefects.map((d, i) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-gray-700/50 align-top">
                    <td className="py-2 px-2 font-medium text-gray-900 dark:text-white capitalize">{d.category}</td>
                    <td className="px-2 text-gray-600 dark:text-gray-300">{d.storeName}</td>
                    <td className="px-2 text-gray-500 dark:text-gray-400">{d.regionName}</td>
                    <td className="px-2 font-semibold">{d.count}</td>
                    <td className="px-2 text-xs text-gray-500 dark:text-gray-400 max-w-[220px]">{d.possibleRootCause}</td>
                    <td className="px-2 text-xs text-gray-500 dark:text-gray-400 max-w-[220px]">{d.suggestedAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
