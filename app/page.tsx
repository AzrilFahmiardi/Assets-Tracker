'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import AssetCard from '@/components/AssetCard'
import PortfolioChart from '@/components/PortfolioChart'
import AddAssetModal from '@/components/AddAssetModal'
import { getAssets, getPortfolioHistory, savePortfolioSnapshot } from '@/lib/firestore'
import { refreshAllPrices } from '@/lib/prices'
import { calcPortfolioSummary, formatRupiah, formatPercent } from '@/lib/portfolio'
import type { Asset, PortfolioHistoryEntry, PortfolioSummary } from '@/types/asset'

export default function DashboardPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [history, setHistory] = useState<PortfolioHistoryEntry[]>([])
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)

  const load = useCallback(async () => {
    const [fetchedAssets, fetchedHistory] = await Promise.all([
      getAssets(),
      getPortfolioHistory(),
    ])
    setAssets(fetchedAssets)
    setHistory(fetchedHistory)
    setSummary(calcPortfolioSummary(fetchedAssets))
    setInitialLoad(false)
    return { assets: fetchedAssets, history: fetchedHistory }
  }, [])

  const refreshPrices = useCallback(
    async (currentAssets: Asset[], currentHistory: PortfolioHistoryEntry[]) => {
      if (!currentAssets.length) return
      setLoadingPrices(true)
      const updates = await refreshAllPrices(currentAssets)

      const updated = currentAssets.map((a) =>
        updates.has(a.id)
          ? { ...a, currentPrice: updates.get(a.id)!, lastPriceUpdate: new Date() }
          : a
      )
      setAssets(updated)
      setSummary(calcPortfolioSummary(updated))
      setLoadingPrices(false)

      // Daily snapshot jika belum ada hari ini
      const today = new Date().toISOString().split('T')[0]
      const alreadyExists = currentHistory.some((h) => h.date === today)
      if (!alreadyExists && updates.size > 0) {
        const s = calcPortfolioSummary(updated)
        const snapshot: PortfolioHistoryEntry = {
          date: today,
          totalValue: s.totalValue,
          totalCost: s.totalCost,
          breakdown: s.assets.map((a) => ({
            assetId: a.id,
            name: a.name,
            value: a.currentValue,
            cost: a.costBasis,
          })),
        }
        await savePortfolioSnapshot(snapshot)
        setHistory((prev) => [...prev, snapshot])
      }
    },
    []
  )

  useEffect(() => {
    load().then(({ assets: a, history: h }) => refreshPrices(a, h))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualRefresh = async () => {
    setLoadingPrices(true)
    const freshAssets = await getAssets()
    const forced = freshAssets.map((a) => ({ ...a, lastPriceUpdate: null }))
    await refreshAllPrices(forced)
    const reloaded = await getAssets()
    setAssets(reloaded)
    setSummary(calcPortfolioSummary(reloaded))
    setLoadingPrices(false)
  }

  const isProfit = (summary?.totalProfitLoss ?? 0) >= 0

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />

      {/* Header */}
      <div className="bg-gray-900 text-white px-5 pt-14 pb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-sm font-medium text-gray-400">Portofolio Saya</h1>
          <button
            onClick={handleManualRefresh}
            disabled={loadingPrices}
            className="p-2 rounded-full hover:bg-white/10 disabled:opacity-40"
          >
            <RefreshCw size={16} className={loadingPrices ? 'animate-spin' : ''} />
          </button>
        </div>

        {initialLoad ? (
          <div>
            <div className="w-40 h-9 bg-white/10 rounded-lg animate-pulse mb-2" />
            <div className="w-28 h-5 bg-white/10 rounded-lg animate-pulse" />
          </div>
        ) : (
          <div>
            <p className="text-3xl font-bold tracking-tight">
              {formatRupiah(summary?.totalValue ?? 0)}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              {isProfit ? (
                <TrendingUp size={14} className="text-emerald-400" />
              ) : (
                <TrendingDown size={14} className="text-red-400" />
              )}
              <span
                className={`text-sm font-medium ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}
              >
                {isProfit ? '+' : ''}
                {formatRupiah(summary?.totalProfitLoss ?? 0)}{' '}
                ({formatPercent(summary?.totalProfitLossPercent ?? 0)})
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Modal: {formatRupiah(summary?.totalCost ?? 0)}
            </p>
          </div>
        )}
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Grafik portofolio */}
        <PortfolioChart history={history} />

        {/* Daftar aset */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-600">Aset ({assets.length})</h2>
          </div>
          {initialLoad ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 h-24 animate-pulse" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
              <p className="text-2xl mb-2">📊</p>
              <p className="text-sm font-medium text-gray-700">Belum ada aset</p>
              <p className="text-xs text-gray-400 mt-1">
                Tap tombol + untuk menambahkan aset pertama
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {(summary?.assets ?? []).map((asset) => (
                <AssetCard key={asset.id} asset={asset} loading={loadingPrices} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAddAsset(true)}
        className="fixed bottom-6 right-5 w-14 h-14 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform z-40"
      >
        <Plus size={24} />
      </button>

      {showAddAsset && (
        <AddAssetModal
          onClose={() => setShowAddAsset(false)}
          onAdded={() => load().then(({ assets: a, history: h }) => refreshPrices(a, h))}
        />
      )}
    </main>
  )
}
