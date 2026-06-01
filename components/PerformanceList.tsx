'use client'

import { formatPercent, formatRupiah } from '@/lib/portfolio'
import type { AssetWithValue } from '@/types/asset'

interface Props {
  assets: AssetWithValue[]
}

export default function PerformanceList({ assets }: Props) {
  const sorted = [...assets].sort((a, b) => b.profitLossPercent - a.profitLossPercent)

  const maxAbs = Math.max(...sorted.map((a) => Math.abs(a.profitLossPercent)), 1)

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Performa Aset</h3>
      <div className="space-y-4">
        {sorted.map((asset) => {
          const isProfit = asset.profitLossPercent >= 0
          const barWidth = Math.abs(asset.profitLossPercent / maxAbs) * 100

          return (
            <div key={asset.id}>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-700 truncate max-w-[60%]">
                  {asset.name}
                </span>
                <div className="text-right shrink-0 ml-2">
                  <span
                    className={`text-xs font-bold ${isProfit ? 'text-emerald-600' : 'text-rose-500'}`}
                  >
                    {formatPercent(asset.profitLossPercent)}
                  </span>
                  <span className={`text-xs ml-1 ${isProfit ? 'text-emerald-500' : 'text-rose-400'}`}>
                    ({isProfit ? '+' : ''}{formatRupiah(asset.profitLoss)})
                  </span>
                </div>
              </div>
              {/* Bar */}
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isProfit ? 'bg-emerald-500' : 'bg-rose-400'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
