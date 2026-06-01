import type { Asset, AssetWithValue, PortfolioSummary } from '@/types/asset'

export function calcAssetValue(asset: Asset): AssetWithValue {
  const currentValue = calcCurrentValue(asset)
  const profitLoss = currentValue - asset.costBasis
  const profitLossPercent = asset.costBasis > 0 ? (profitLoss / asset.costBasis) * 100 : 0
  return { ...asset, currentValue, profitLoss, profitLossPercent }
}

export function calcCurrentValue(asset: Asset): number {
  if (asset.type === 'saham') {
    const lotSize = asset.metadata.lotSize ?? 100
    return asset.quantity * lotSize * asset.currentPrice
  }
  if (asset.type === 'emas') {
    return asset.quantity * asset.currentPrice
  }
  // rdpu: quantity = jumlah unit, currentPrice = NAV per unit
  return asset.quantity * asset.currentPrice
}

export function calcPortfolioSummary(assets: Asset[]): PortfolioSummary {
  const enriched = assets.map(calcAssetValue)
  const totalValue = enriched.reduce((s, a) => s + a.currentValue, 0)
  const totalCost = enriched.reduce((s, a) => s + a.costBasis, 0)
  const totalProfitLoss = totalValue - totalCost
  const totalProfitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0
  return { totalValue, totalCost, totalProfitLoss, totalProfitLossPercent, assets: enriched }
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatQuantity(asset: Asset): string {
  if (asset.type === 'saham') return `${asset.quantity} lot`
  if (asset.type === 'emas') return `${asset.quantity} gram`
  if (asset.type === 'rdpu') return `${asset.quantity.toFixed(4)} unit`
  if (asset.type === 'crypto') return `${asset.quantity} coin`
  return `${asset.quantity}`
}

export function isStale(lastUpdate: Date | null, thresholdMs: number): boolean {
  if (!lastUpdate) return true
  return Date.now() - new Date(lastUpdate).getTime() > thresholdMs
}

export const STALE_THRESHOLDS: Record<string, number> = {
  saham: 30 * 60 * 1000,       // 30 menit
  emas: 12 * 60 * 60 * 1000,   // 12 jam
  rdpu: 18 * 60 * 60 * 1000,   // 18 jam
  crypto: 15 * 60 * 1000,       // 15 menit
  etf: 30 * 60 * 1000,
  other: 24 * 60 * 60 * 1000,
}
