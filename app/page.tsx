'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import AssetCard from '@/components/AssetCard'
import PortfolioChart from '@/components/PortfolioChart'
import AllocationChart from '@/components/AllocationChart'
import PerformanceList from '@/components/PerformanceList'
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
    <main className="min-h-screen bg-slate-50 pb-24">
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />

      {/* Header */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white px-5 pt-14 pb-8">
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs font-medium text-slate-400 tracking-wide uppercase">
            Portofolio Saya
          </p>
          <button
            onClick={handleManualRefresh}
            disabled={loadingPrices}
            className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={15} className={loadingPrices ? 'animate-spin' : ''} />
          </button>
        </div>

        {initialLoad ? (
          <div>
            <div className="w-44 h-8 bg-white/10 rounded-lg animate-pulse mb-2" />
            <div className="w-32 h-4 bg-white/10 rounded-lg animate-pulse" />
          </div>
        ) : (
          <div>
            <p className="text-3xl font-bold tracking-tight">
              {formatRupiah(summary?.totalValue ?? 0)}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              {isProfit
                ? <TrendingUp size={13} className="text-emerald-400" />
                : <TrendingDown size={13} className="text-rose-400" />
              }
              <span className={`text-sm font-medium ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isProfit ? '+' : ''}{formatRupiah(summary?.totalProfitLoss ?? 0)}{' '}
                <span className="font-normal opacity-80">
                  ({formatPercent(summary?.totalProfitLossPercent ?? 0)})
                </span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Modal {formatRupiah(summary?.totalCost ?? 0)}
            </p>
          </div>
        )}
      </div>

      <div className="px-4 mt-4 space-y-3">
        {/* Grafik history */}
        <PortfolioChart history={history} />

        {/* Insight: Alokasi + Performa */}
        {!initialLoad && (summary?.assets?.length ?? 0) > 0 && (
          <>
            <AllocationChart assets={summary!.assets} />
            <PerformanceList assets={summary!.assets} />
          </>
        )}

        {/* Daftar aset */}
        <div>
          <div className="flex items-center justify-between mb-3 mt-1">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Aset ({assets.length})
            </h2>
          </div>

          {initialLoad ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl p-4 h-24 animate-pulse border border-slate-100" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="bg-white rounded-xl p-10 text-center border border-slate-100">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <TrendingUp size={20} className="text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700">Belum ada aset</p>
              <p className="text-xs text-slate-400 mt-1">Tap + untuk menambahkan aset pertama</p>
            </div>
          ) : (
            <div className="space-y-2.5">
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
        className="fixed bottom-6 right-5 w-13 h-13 w-[52px] h-[52px] bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center active:scale-90 transition-transform z-40"
      >
        <Plus size={22} />
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
