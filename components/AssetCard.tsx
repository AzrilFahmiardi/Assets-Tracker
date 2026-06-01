'use client'

import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  Building2,
  Gem,
  Zap,
  Globe,
  Briefcase,
} from 'lucide-react'
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

const TYPE_ICONS: Record<string, React.ReactNode> = {
  saham: <TrendingUp size={13} />,
  rdpu: <Building2 size={13} />,
  emas: <Gem size={13} />,
  crypto: <Zap size={13} />,
  etf: <Globe size={13} />,
  other: <Briefcase size={13} />,
}

interface Props {
  asset: AssetWithValue
  loading?: boolean
}

export default function AssetCard({ asset, loading }: Props) {
  const isProfit = asset.profitLoss >= 0

  return (
    <Link href={`/assets/${asset.id}`} className="block">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 active:scale-[0.98] transition-transform">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                {TYPE_ICONS[asset.type]}
                {TYPE_LABELS[asset.type]}
              </span>
            </div>
            <h3 className="font-semibold text-slate-900 text-sm leading-tight truncate">
              {asset.name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{asset.platform}</p>
          </div>
          {loading ? (
            <Loader2 size={15} className="text-slate-300 animate-spin mt-1 shrink-0" />
          ) : isProfit ? (
            <TrendingUp size={17} className="text-emerald-500 mt-1 shrink-0" />
          ) : (
            <TrendingDown size={17} className="text-rose-400 mt-1 shrink-0" />
          )}
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-lg font-bold text-slate-900">
              {loading ? (
                <span className="inline-block w-28 h-5 bg-slate-100 rounded animate-pulse" />
              ) : (
                formatRupiah(asset.currentValue)
              )}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{formatQuantity(asset)}</p>
          </div>
          <div className="text-right">
            {loading ? (
              <span className="inline-block w-16 h-4 bg-slate-100 rounded animate-pulse" />
            ) : (
              <>
                <p className={`text-sm font-semibold ${isProfit ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {formatPercent(asset.profitLossPercent)}
                </p>
                <p className={`text-xs ${isProfit ? 'text-emerald-500' : 'text-rose-400'}`}>
                  {isProfit ? '+' : ''}{formatRupiah(asset.profitLoss)}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
