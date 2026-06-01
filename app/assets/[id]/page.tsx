'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, Plus, RefreshCw, Info, Edit2 } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { getAsset, getTransactions, deleteAsset, deleteTransaction, updateAsset } from '@/lib/firestore'
import { refreshAssetPrice } from '@/lib/prices'
import { calcAssetValue, formatRupiah, formatPercent, formatQuantity } from '@/lib/portfolio'
import AddTransactionModal from '@/components/AddTransactionModal'
import ManualPriceModal from '@/components/ManualPriceModal'
import type { Asset, Transaction, AssetWithValue } from '@/types/asset'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PriceTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="font-bold text-slate-900">{formatRupiah(payload[0].value)}</p>
    </div>
  )
}

const TYPE_LABELS: Record<string, string> = {
  saham: 'Saham',
  rdpu: 'Reksa Dana',
  emas: 'Emas',
  crypto: 'Kripto',
  etf: 'ETF',
  other: 'Lainnya',
}

export default function AssetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [asset, setAsset] = useState<AssetWithValue | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [priceError, setPriceError] = useState(false)
  const [showAddTx, setShowAddTx] = useState(false)
  const [showManualPrice, setShowManualPrice] = useState(false)

  const load = useCallback(async () => {
    const [a, txs] = await Promise.all([getAsset(id), getTransactions(id)])
    if (!a) { router.push('/'); return }
    setAsset(calcAssetValue(a))
    setTransactions(txs)
    return a
  }, [id, router])

  const doRefreshPrice = useCallback(async (a: Asset) => {
    setLoadingPrice(true)
    setPriceError(false)
    const price = await refreshAssetPrice({ ...a, lastPriceUpdate: null })
    if (price !== null) {
      setAsset(calcAssetValue({ ...a, currentPrice: price, lastPriceUpdate: new Date() }))
    } else {
      setPriceError(true)
    }
    setLoadingPrice(false)
  }, [])

  useEffect(() => {
    load().then((a) => { if (a) doRefreshPrice(a) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete() {
    if (!confirm('Hapus aset ini? Semua data akan terhapus.')) return
    await deleteAsset(id)
    toast.success('Aset dihapus')
    router.push('/')
  }

  async function handleDeleteTransaction(tx: Transaction) {
    if (!confirm('Hapus transaksi ini?')) return
    await deleteTransaction(tx.id)
    const current = await getAsset(id)
    if (current) {
      if (tx.type === 'sell') {
        await updateAsset(id, {
          quantity: current.quantity + tx.quantity,
          costBasis: current.costBasis + tx.totalAmount,
        })
      } else {
        await updateAsset(id, {
          quantity: Math.max(0, current.quantity - tx.quantity),
          costBasis: Math.max(0, current.costBasis - tx.totalAmount),
        })
      }
    }
    toast.success('Transaksi dihapus')
    load()
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
      </div>
    )
  }

  const isProfit = asset.profitLoss >= 0

  const txChartData = transactions
    .slice()
    .reverse()
    .map((tx) => ({
      date: new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      value: tx.totalAmount,
    }))

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />

      {/* Header */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white px-5 pt-14 pb-6">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => router.push('/')}
            className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex gap-1">
            <button
              onClick={() => doRefreshPrice(asset)}
              disabled={loadingPrice}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-40 transition-colors"
            >
              <RefreshCw size={15} className={loadingPrice ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Trash2 size={15} className="text-rose-400" />
            </button>
          </div>
        </div>

        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-400">{TYPE_LABELS[asset.type]}</span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400">{asset.platform}</span>
          </div>
          <h1 className="text-xl font-bold">{asset.name}</h1>
          {asset.metadata.ticker && (
            <p className="text-xs text-slate-400 mt-0.5 font-mono">{asset.metadata.ticker}</p>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Nilai Sekarang" loading={loadingPrice}>
            {formatRupiah(asset.currentValue)}
          </StatCard>
          <StatCard label="Modal">
            {formatRupiah(asset.costBasis)}
          </StatCard>
          <StatCard label="Profit / Loss" colored isProfit={isProfit}>
            {isProfit ? '+' : ''}{formatRupiah(asset.profitLoss)}
          </StatCard>
          <StatCard label="Return" colored isProfit={isProfit}>
            {formatPercent(asset.profitLossPercent)}
          </StatCard>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-slate-400">{formatQuantity(asset)}</p>
          {asset.lastPriceUpdate && (
            <p className="text-xs text-slate-500">
              Update{' '}
              {new Date(asset.lastPriceUpdate).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {/* Banner manual price */}
        {priceError && (
          <button
            onClick={() => setShowManualPrice(true)}
            className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-left"
          >
            <Info size={16} className="text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-800">Harga tidak bisa diambil otomatis</p>
              <p className="text-xs text-amber-600 mt-0.5">Tap untuk update manual</p>
            </div>
            <Edit2 size={13} className="text-amber-400 shrink-0" />
          </button>
        )}

        {/* Chart transaksi */}
        {txChartData.length > 1 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Riwayat Investasi
            </h3>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={txChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}jt`}
                  width={36}
                />
                <Tooltip content={<PriceTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#4F46E5"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#4F46E5', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Riwayat transaksi */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Transaksi ({transactions.length})
          </h3>

          {transactions.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center border border-slate-100">
              <p className="text-xs text-slate-400">Belum ada transaksi dicatat</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-100 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-medium shrink-0 ${
                          tx.type === 'sell'
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {tx.type === 'sell' ? 'Jual' : 'Beli'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(tx.date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    {tx.notes && (
                      <p className="text-xs text-slate-400 mt-0.5">{tx.notes}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatRupiah(tx.totalAmount)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {tx.quantity} × {formatRupiah(tx.pricePerUnit)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteTransaction(tx)}
                    className="p-2 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-400 transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAddTx(true)}
        className="fixed bottom-6 right-5 w-[52px] h-[52px] bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center active:scale-90 transition-transform z-40"
      >
        <Plus size={22} />
      </button>

      {showAddTx && (
        <AddTransactionModal
          asset={asset}
          onClose={() => setShowAddTx(false)}
          onAdded={() => load()}
        />
      )}

      {showManualPrice && (
        <ManualPriceModal
          asset={asset}
          onClose={() => setShowManualPrice(false)}
          onUpdated={(price) => {
            setAsset(calcAssetValue({ ...asset, currentPrice: price, lastPriceUpdate: new Date() }))
            setPriceError(false)
          }}
        />
      )}
    </main>
  )
}

function StatCard({
  label,
  children,
  loading,
  colored,
  isProfit,
}: {
  label: string
  children: React.ReactNode
  loading?: boolean
  colored?: boolean
  isProfit?: boolean
}) {
  const bg = colored
    ? isProfit ? 'bg-emerald-500/20' : 'bg-rose-500/20'
    : 'bg-white/10'

  const textColor = colored
    ? isProfit ? 'text-emerald-300' : 'text-rose-300'
    : 'text-white'

  return (
    <div className={`${bg} rounded-xl p-3`}>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {loading ? (
        <div className="w-24 h-5 bg-white/20 rounded animate-pulse" />
      ) : (
        <p className={`text-base font-bold ${textColor}`}>{children}</p>
      )}
    </div>
  )
}
