import { updateAsset } from './firestore'
import { isStale, STALE_THRESHOLDS } from './portfolio'
import type { Asset } from '@/types/asset'

async function fetchStockPrice(ticker: string): Promise<number | null> {
  try {
    const res = await fetch(`/api/prices/stock?ticker=${encodeURIComponent(ticker)}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.price ?? null
  } catch {
    return null
  }
}

async function fetchGoldPrice(): Promise<number | null> {
  try {
    const res = await fetch('/api/prices/gold')
    if (!res.ok) return null
    const data = await res.json()
    return data.price ?? null
  } catch {
    return null
  }
}

async function fetchRdpuNav(fundName: string): Promise<number | null> {
  try {
    const res = await fetch(`/api/prices/rdpu?name=${encodeURIComponent(fundName)}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.nav ?? null
  } catch {
    return null
  }
}

export async function refreshAssetPrice(asset: Asset): Promise<number | null> {
  const threshold = STALE_THRESHOLDS[asset.type] ?? STALE_THRESHOLDS.other
  if (!isStale(asset.lastPriceUpdate, threshold)) return asset.currentPrice

  let price: number | null = null

  if (asset.type === 'saham' || asset.type === 'etf') {
    const ticker = asset.metadata.ticker
    if (ticker) price = await fetchStockPrice(ticker)
  } else if (asset.type === 'emas') {
    price = await fetchGoldPrice()
  } else if (asset.type === 'rdpu') {
    price = await fetchRdpuNav(asset.name)
  }

  if (price !== null) {
    await updateAsset(asset.id, {
      currentPrice: price,
      lastPriceUpdate: new Date(),
    })
  }

  return price
}

export async function refreshAllPrices(assets: Asset[]): Promise<Map<string, number>> {
  const updates = new Map<string, number>()
  await Promise.allSettled(
    assets.map(async (asset) => {
      const price = await refreshAssetPrice(asset)
      if (price !== null) updates.set(asset.id, price)
    })
  )
  return updates
}
