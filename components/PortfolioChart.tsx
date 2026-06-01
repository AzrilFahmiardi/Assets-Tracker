'use client'

import { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { formatRupiah } from '@/lib/portfolio'
import type { PortfolioHistoryEntry } from '@/types/asset'

type Range = '1W' | '1M' | '3M' | '6M' | 'ALL'

const RANGES: Range[] = ['1W', '1M', '3M', '6M', 'ALL']
const RANGE_DAYS: Record<Range, number> = {
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '6M': 180,
  ALL: Infinity,
}

interface Props {
  history: PortfolioHistoryEntry[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="font-bold text-slate-900">{formatRupiah(payload[0].value)}</p>
    </div>
  )
}

export default function PortfolioChart({ history }: Props) {
  const [range, setRange] = useState<Range>('1M')

  const cutoff = new Date()
  const days = RANGE_DAYS[range]
  cutoff.setDate(cutoff.getDate() - (isFinite(days) ? days : 36500))

  const filtered = history.filter((h) => new Date(h.date) >= cutoff)

  const data = filtered.map((h) => ({
    date: new Date(h.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    value: h.totalValue,
  }))

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 h-44 flex items-center justify-center">
        <p className="text-xs text-slate-400">Grafik tersedia setelah beberapa hari data terkumpul</p>
      </div>
    )
  }

  const minVal = Math.min(...data.map((d) => d.value))
  const maxVal = Math.max(...data.map((d) => d.value))
  const isAllUp = data[data.length - 1]?.value >= data[0]?.value

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700">Nilai Portofolio</h3>
        <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                range === r ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minVal * 0.995, maxVal * 1.005]}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}jt`}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={isAllUp ? '#10b981' : '#f43f5e'}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
