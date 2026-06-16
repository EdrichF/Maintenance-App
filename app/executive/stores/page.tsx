export const dynamic = 'force-dynamic'

import { ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { requireExecutive } from '@/lib/dashboards/guard'
import { assembleEstateDashboard, type StoreCard } from '@/lib/dashboards/data'
import { RagBadge, SectionCard } from '@/components/dashboards/primitives'
import { formatCurrency } from '@/lib/utils'

export default async function ExecutiveStoresPage() {
  await requireExecutive()
  const data = await assembleEstateDashboard()
  const regionName = new Map(data.regions.map(r => [r.region.regionId, r.regionName]))
  const rn = (id: string | null) => regionName.get(id ?? '') ?? '—'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldAlert size={20} className="text-red-500" /> Store Ranking
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Every store grouped by health band. Top risk first, then attention, then controlled.</p>
      </div>

      {/* Top risk */}
      <SectionCard title={`Top Risk (${data.topRiskStores.length})`} icon={<ShieldAlert size={16} className="text-red-500" />}>
        {data.topRiskStores.length === 0 ? (
          <p className="text-sm text-gray-400">No stores under stress.</p>
        ) : (
          <div className="overflow-x-auto -mx-2">
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
                    <td className="px-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{rn(store.regionId)}</td>
                    <td className="px-2 font-semibold">{store.finalHealthScore}%</td>
                    <td className="px-2"><RagBadge rag={store.finalRag} /></td>
                    <td className="px-2 text-xs text-gray-500 dark:text-gray-400 max-w-[220px]">{store.mainIssue}</td>
                    <td className="px-2">{store.openTickets}</td>
                    <td className="px-2 text-red-600 dark:text-red-400">{store.overdueTickets}</td>
                    <td className="px-2">{store.pendingApprovals}</td>
                    <td className="px-2 whitespace-nowrap">{formatCurrency(store.costExposure)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Amber */}
      <SectionCard title={`Amber — Attention (${data.amberStores.length})`} icon={<AlertTriangle size={16} className="text-amber-500" />}>
        <StoreBandList stores={data.amberStores} rn={rn} empty="No stores in the amber band." />
      </SectionCard>

      {/* Controlled */}
      <SectionCard title={`Controlled (${data.controlledStores.length})`} icon={<CheckCircle2 size={16} className="text-green-500" />}>
        <StoreBandList stores={data.controlledStores} rn={rn} empty="No stores in the green band yet." />
      </SectionCard>
    </div>
  )
}

function StoreBandList({ stores, rn, empty }: { stores: StoreCard[]; rn: (id: string | null) => string; empty: string }) {
  if (stores.length === 0) return <p className="text-sm text-gray-400">{empty}</p>
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="text-left text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700">
            <th className="py-2 px-2">Store</th><th className="px-2">Region</th><th className="px-2">Health</th>
            <th className="px-2">Status</th><th className="px-2">Open</th><th className="px-2">Overdue</th><th className="px-2">Note</th>
          </tr>
        </thead>
        <tbody>
          {stores.map(store => (
            <tr key={store.storeId} className="border-b border-gray-50 dark:border-gray-700/50 align-top">
              <td className="py-2 px-2 font-medium text-gray-900 dark:text-white">{store.storeName}</td>
              <td className="px-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{rn(store.regionId)}</td>
              <td className="px-2 font-semibold">{store.finalHealthScore}%</td>
              <td className="px-2"><RagBadge rag={store.finalRag} /></td>
              <td className="px-2">{store.openTickets}</td>
              <td className="px-2">{store.overdueTickets}</td>
              <td className="px-2 text-xs text-gray-500 dark:text-gray-400 max-w-[240px]">{store.mainIssue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
