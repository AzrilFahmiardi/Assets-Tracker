'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { addTransaction, updateAsset, getAsset } from '@/lib/firestore'
import toast from 'react-hot-toast'
import type { Asset } from '@/types/asset'

interface Props {
  asset: Asset
  onClose: () => void
  onAdded: () => void
}

export default function AddTransactionModal({ asset, onClose, onAdded }: Props) {
  const [loading, setLoading] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    type: 'buy' as 'buy' | 'sell',
    date: today,
    quantity: '',
    pricePerUnit: '',
    notes: '',
  })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const qty = parseFloat(form.quantity) || 0
  const price = parseFloat(form.pricePerUnit) || 0
  const total = qty * price

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!qty || !price) { toast.error('Isi jumlah dan harga'); return }
    setLoading(true)

    try {
      await addTransaction({
        assetId: asset.id,
        type: form.type,
        date: new Date(form.date),
        quantity: qty,
        pricePerUnit: price,
        totalAmount: total,
        notes: form.notes.trim(),
      })

      const current = await getAsset(asset.id)
      if (current) {
        if (form.type === 'sell') {
          await updateAsset(asset.id, {
            quantity: Math.max(0, current.quantity - qty),
            costBasis: Math.max(0, current.costBasis - total),
          })
        } else {
          await updateAsset(asset.id, {
            quantity: current.quantity + qty,
            costBasis: current.costBasis + total,
          })
        }
      }

      toast.success('Transaksi dicatat')
      onAdded()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Gagal menyimpan transaksi')
    } finally {
      setLoading(false)
    }
  }

  const unitLabel =
    asset.type === 'saham' ? 'lot' : asset.type === 'emas' ? 'gram' : 'unit'

  const priceLabel =
    asset.type === 'saham' ? 'Harga per Lembar (Rp)'
    : asset.type === 'emas' ? 'Harga per Gram (Rp)'
    : 'NAV per Unit (Rp)'

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-2xl">
        <div className="px-5 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Tambah Transaksi</h2>
            <p className="text-xs text-slate-400 mt-0.5">{asset.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="flex gap-2">
            {(['buy', 'sell'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set('type', t)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  form.type === t
                    ? t === 'sell' ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {t === 'buy' ? 'Tambah / Beli' : 'Jual / Tarik'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Tanggal</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Jumlah ({unitLabel})
            </label>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => set('quantity', e.target.value)}
              placeholder="0"
              min="0"
              step="any"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">{priceLabel}</label>
            <input
              type="number"
              value={form.pricePerUnit}
              onChange={(e) => set('pricePerUnit', e.target.value)}
              placeholder="0"
              min="0"
              className={inputClass}
              required
            />
          </div>

          {total > 0 && (
            <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center border border-slate-100">
              <span className="text-xs text-slate-500">Total</span>
              <span className="text-sm font-bold text-slate-900">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                }).format(total)}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Catatan <span className="font-normal text-slate-400">· opsional</span>
            </label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="DCA bulanan, target harga, dll"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
          </button>
        </form>
      </div>
    </div>
  )
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder:text-slate-400'
