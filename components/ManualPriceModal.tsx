'use client'

import { useState } from 'react'
import { X, AlertCircle } from 'lucide-react'
import { updateAsset } from '@/lib/firestore'
import toast from 'react-hot-toast'
import type { Asset } from '@/types/asset'

interface Props {
  asset: Asset
  onClose: () => void
  onUpdated: (price: number) => void
}

export default function ManualPriceModal({ asset, onClose, onUpdated }: Props) {
  const [price, setPrice] = useState(asset.currentPrice ? String(asset.currentPrice) : '')
  const [loading, setLoading] = useState(false)

  const label =
    asset.type === 'saham'
      ? 'Harga per lembar (Rp)'
      : asset.type === 'emas'
        ? 'Harga per gram (Rp)'
        : 'NAV per unit (Rp)'

  const hint =
    asset.type === 'rdpu'
      ? 'Lihat NAV terkini di Bibit, lalu masukkan di sini.'
      : asset.type === 'emas'
        ? 'Lihat harga emas di Tring Pegadaian, lalu masukkan di sini.'
        : 'Masukkan harga saham terkini.'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const p = parseFloat(price)
    if (!p || p <= 0) {
      toast.error('Masukkan harga yang valid')
      return
    }
    setLoading(true)
    try {
      await updateAsset(asset.id, { currentPrice: p, lastPriceUpdate: new Date() })
      toast.success('Harga berhasil diupdate')
      onUpdated(p)
      onClose()
    } catch {
      toast.error('Gagal update harga')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Update Harga Manual</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">{hint}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-gray-50"
              autoFocus
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gray-900 text-white rounded-2xl font-semibold text-sm disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Simpan Harga'}
          </button>
        </form>
      </div>
    </div>
  )
}
