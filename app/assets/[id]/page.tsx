'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit2, Trash2, Plus, RefreshCw, AlertCircle } from 'lucide-react'
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
import { getAsset, getTransactions, deleteAsset } from '@/lib/firestore'
import { refreshAssetPrice } from '@/lib/prices'
import { calcAssetValue, formatRupiah, formatPercent, formatQuantity } from '@/lib/portfolio'
import AddTransactionModal from '@/components/AddTransactionModal'
import ManualPriceModal from '@/components/ManualPriceModal'
import type { Asset, Transaction, AssetWithValue } from '@/types/asset'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PriceTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="font-bold text-gray-900">{formatRupiah(payload[0].value)}</p>
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

  if (!asset) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  const isProfit = asset.profitLoss >= 0

  // Grafik sederhana dari transaksi (jika ada)
  const txChartData = transactions
    .slice()
    .reverse()
    .map((tx) => ({
      date: new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      value: tx.totalAmount,
    }))

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />

      {/* Header */}
      <div className="bg-gray-900 text-white px-5 pt-14 pb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.push('/')} className="p-2 -ml-2 rounded-full hover:bg-white/10">
            <ArrowLeft size={20} />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => doRefreshPrice(asset)}
              disabled={loadingPrice}
              className="p-2 rounded-full hover:bg-white/10 disabled:opacity-40"
            >
              <RefreshCw size={16} className={loadingPrice ? 'animate-spin' : ''} />
            </button>
            <button onClick={handleDelete} className="p-2 rounded-full hover:bg-white/10">
              <Trash2 size={16} className="text-red-400" />
            </button>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-xs text-gray-400">
              {TYPE_LABELS[asset.type]} · {asset.platform}
            </p>
            <h1 className="text-lg font-bold mt-0.5">{asset.name}</h1>
            {asset.metadata.ticker && (
              <p className="text-xs text-gray-400 mt-0.5">{asset.metadata.ticker}</p>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-2xl p-3">
            <p className="text-xs text-gray-400">Nilai Sekarang</p>
            <p className="text-lg font-bold mt-0.5">
              {loadingPrice ? (
                <span className="inline-block w-24 h-5 bg-white/20 rounded animate-pulse" />
              ) : (
                formatRupiah(asset.currentValue)
              )}
            </p>
          </div>
          <div className="bg-white/10 rounded-2xl p-3">
            <p className="text-xs text-gray-400">Modal</p>
            <p className="text-lg font-bold mt-0.5">{formatRupiah(asset.costBasis)}</p>
          </div>
          <div
            className={`rounded-2xl p-3 ${isProfit ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}
          >
            <p className="text-xs text-gray-400">Profit/Loss</p>
            <p className={`text-lg font-bold mt-0.5 ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
              {isProfit ? '+' : ''}{formatRupiah(asset.profitLoss)}
            </p>
          </div>
          <div
            className={`rounded-2xl p-3 ${isProfit ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}
          >
            <p className="text-xs text-gray-400">Return</p>
            <p className={`text-lg font-bold mt-0.5 ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatPercent(asset.profitLossPercent)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-gray-400">{formatQuantity(asset)}</p>
          {asset.lastPriceUpdate && (
            <p className="text-xs text-gray-500">
              Update:{' '}
              {new Date(asset.lastPriceUpdate).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Banner manual price update */}
        {priceError && (
          <div
            className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 cursor-pointer"
            onClick={() => setShowManualPrice(true)}
          >
            <AlertCircle size={18} className="text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">Harga tidak bisa diambil otomatis</p>
              <p className="text-xs text-amber-600 mt-0.5">Tap di sini untuk update manual</p>
            </div>
            <Edit2 size={14} className="text-amber-500" />
          </div>
        )}

        {/* Grafik transaksi */}
        {txChartData.length > 1 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-xs font-semibold text-gray-600 mb-3">Riwayat Investasi</h3>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={txChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}jt`}
                  width={36}
                />
                <Tooltip content={<PriceTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Riwayat transaksi */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-600">
              Transaksi ({transactions.length})
            </h3>
          </div>

          {transactions.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-gray-100">
              <p className="text-xs text-gray-400">Belum ada transaksi dicatat</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          tx.type === 'sell'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {tx.type === 'topup' ? 'Topup' : tx.type === 'buy' ? 'Beli' : 'Jual'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(tx.date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    {tx.notes && <p className="text-xs text-gray-400 mt-0.5">{tx.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatRupiah(tx.totalAmount)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {tx.quantity} × {formatRupiah(tx.pricePerUnit)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB tambah transaksi */}
      <button
        onClick={() => setShowAddTx(true)}
        className="fixed bottom-6 right-5 w-14 h-14 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform z-40"
      >
        <Plus size={24} />
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
