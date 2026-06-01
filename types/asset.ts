export type AssetType = 'saham' | 'rdpu' | 'emas' | 'crypto' | 'etf' | 'other'
export type PriceSource = 'yahoo' | 'antam-scrape' | 'ojk-scrape' | 'manual'

export interface AssetMetadata {
  ticker?: string      // untuk saham: "BBCA.JK"
  lotSize?: number     // untuk saham IDX: 100 lembar/lot
  weightUnit?: string  // untuk emas: "gram"
  fundCode?: string    // untuk RDPU
  currency?: string    // default IDR
}

export interface Asset {
  id: string
  name: string
  type: AssetType
  platform: string
  quantity: number         // lot (saham) / unit (rdpu) / gram (emas) / coin (crypto)
  costBasis: number        // total modal dalam IDR
  priceSource: PriceSource
  metadata: AssetMetadata
  currentPrice: number     // harga per unit/lembar/gram terakhir
  lastPriceUpdate: Date | null
  createdAt: Date
}

export interface Transaction {
  id: string
  assetId: string
  type: 'buy' | 'sell'
  date: Date
  quantity: number
  pricePerUnit: number
  totalAmount: number
  notes: string
}

export interface PortfolioHistoryEntry {
  date: string   // "2026-06-01" — juga sebagai dokumen ID di Firestore
  totalValue: number
  totalCost: number
  breakdown: {
    assetId: string
    name: string
    value: number
    cost: number
  }[]
}

export interface AssetWithValue extends Asset {
  currentValue: number
  profitLoss: number
  profitLossPercent: number
}

export interface PortfolioSummary {
  totalValue: number
  totalCost: number
  totalProfitLoss: number
  totalProfitLossPercent: number
  assets: AssetWithValue[]
}
