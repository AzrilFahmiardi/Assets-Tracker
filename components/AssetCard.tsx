'use client'

import Link from 'next/link'
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { formatRupiah, formatPercent, formatQuantity } from '@/lib/portfolio'
import type { AssetWithValue } from '@/types/asset'

const TYPE_LABELS: Record<string, string> = {
  saham: 'Saham',
  rdpu: 'Reksa Dana',
  emas: 'Emas',
  crypto: 'Kripto',
  etf: 'ETF',
  other: 'Lainnya',
}

const TYPE_COLORS: Record<string, string> = {
  saham: 'bg-blue-100 text-blue-700',
  rdpu: 'bg-green-100 text-green-700',
  emas: 'bg-yellow-100 text-yellow-700',
  crypto: 'bg-purple-100 text-purple-700',
  etf: 'bg-cyan-100 text-cyan-700',
  other: 'bg-gray-100 text-gray-700',
}

interface Props {
  asset: AssetWithValue
  loading?: boolean
}

export default function AssetCard({ asset, loading }: Props) {
  const isProfit = asset.profitLoss >= 0

  return (
    <Link href={`/assets/${asset.id}`} className="block">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[asset.type]}`}
              >
                {TYPE_LABELS[asset.type]}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
              {asset.name}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{asset.platform}</p>
          </div>
          {loading ? (
            <Loader2 size={16} className="text-gray-300 animate-spin mt-1" />
          ) : isProfit ? (
            <TrendingUp size={18} className="text-emerald-500 mt-1" />
          ) : (
            <TrendingDown size={18} className="text-red-400 mt-1" />
          )}
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-lg font-bold text-gray-900">
              {loading ? (
                <span className="inline-block w-28 h-5 bg-gray-100 rounded animate-pulse" />
              ) : (
                formatRupiah(asset.currentValue)
              )}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{formatQuantity(asset)}</p>
          </div>
          <div className="text-right">
            {loading ? (
              <span className="inline-block w-16 h-4 bg-gray-100 rounded animate-pulse" />
            ) : (
              <>
                <p
                  className={`text-sm font-semibold ${isProfit ? 'text-emerald-600' : 'text-red-500'}`}
                >
                  {formatPercent(asset.profitLossPercent)}
                </p>
                <p className={`text-xs ${isProfit ? 'text-emerald-500' : 'text-red-400'}`}>
                  {isProfit ? '+' : ''}
                  {formatRupiah(asset.profitLoss)}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
