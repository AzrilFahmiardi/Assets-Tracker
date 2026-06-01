'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatRupiah } from '@/lib/portfolio'
import type { AssetWithValue } from '@/types/asset'

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#F43F5E', '#06B6D4', '#64748B']

const TYPE_LABELS: Record<string, string> = {
  saham: 'Saham',
  rdpu: 'Reksa Dana',
  emas: 'Emas',
  crypto: 'Kripto',
  etf: 'ETF',
  other: 'Lainnya',
}

interface Props {
  assets: AssetWithValue[]
}

type GroupBy = 'type' | 'platform'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-slate-800">{d.name}</p>
      <p className="text-slate-500 mt-0.5">{formatRupiah(d.value)}</p>
      <p className="text-slate-500">{d.percent.toFixed(1)}%</p>
    </div>
  )
}

export default function AllocationChart({ assets }: Props) {
  const [groupBy, setGroupBy] = useState<GroupBy>('type')

  const totalValue = assets.reduce((s, a) => s + a.currentValue, 0)

  const grouped = assets.reduce<Record<string, number>>((acc, a) => {
    const key = groupBy === 'type' ? (TYPE_LABELS[a.type] ?? a.type) : a.platform
    acc[key] = (acc[key] ?? 0) + a.currentValue
    return acc
  }, {})

  const data = Object.entries(grouped)
    .map(([name, value]) => ({
      name,
      value,
      percent: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700">Alokasi Aset</h3>
        <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
          {(['type', 'platform'] as GroupBy[]).map((g) => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                groupBy === g ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
              }`}
            >
              {g === 'type' ? 'Tipe' : 'Platform'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Donut */}
        <div className="shrink-0">
          <ResponsiveContainer width={130} height={130}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={62}
                dataKey="value"
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2 min-w-0">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-xs text-slate-700 truncate">{d.name}</span>
                  <span className="text-xs font-semibold text-slate-800 shrink-0">
                    {d.percent.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-slate-400">{formatRupiah(d.value)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
