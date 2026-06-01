'use client'

import { useState } from 'react'
import { X, ChevronRight, TrendingUp, Building2, Gem, Zap, Globe, Briefcase } from 'lucide-react'
import { addAsset } from '@/lib/firestore'
import type { AssetType, PriceSource } from '@/types/asset'
import toast from 'react-hot-toast'

interface Props {
  onClose: () => void
  onAdded: () => void
}

const ASSET_TYPES: { type: AssetType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: 'saham', label: 'Saham IDX', icon: <TrendingUp size={18} />, desc: 'BBCA, BMRI, dll' },
  { type: 'rdpu', label: 'Reksa Dana', icon: <Building2 size={18} />, desc: 'Pasar uang, obligasi' },
  { type: 'emas', label: 'Emas', icon: <Gem size={18} />, desc: 'Antam, Pegadaian' },
  { type: 'crypto', label: 'Kripto', icon: <Zap size={18} />, desc: 'BTC, ETH, dll' },
  { type: 'etf', label: 'ETF', icon: <Globe size={18} />, desc: 'IDX30, S&P500, dll' },
  { type: 'other', label: 'Lainnya', icon: <Briefcase size={18} />, desc: 'Deposito, obligasi' },
]

export default function AddAssetModal({ onClose, onAdded }: Props) {
  const [step, setStep] = useState<'type' | 'detail'>('type')
  const [selectedType, setSelectedType] = useState<AssetType | null>(null)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: '',
    platform: '',
    ticker: '',
    quantity: '',
    costBasis: '',
    currentPrice: '',
    lotSize: '100',
  })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedType) return
    setLoading(true)

    try {
      const priceSourceMap: Record<AssetType, PriceSource> = {
        saham: 'yahoo',
        rdpu: 'ojk-scrape',
        emas: 'antam-scrape',
        crypto: 'manual',
        etf: 'yahoo',
        other: 'manual',
      }

      await addAsset({
        name: form.name.trim(),
        type: selectedType,
        platform: form.platform.trim(),
        quantity: parseFloat(form.quantity),
        costBasis: parseFloat(form.costBasis),
        priceSource: priceSourceMap[selectedType],
        metadata: {
          ticker: form.ticker ? form.ticker.trim().toUpperCase() : undefined,
          lotSize: selectedType === 'saham' ? parseInt(form.lotSize) : undefined,
          weightUnit: selectedType === 'emas' ? 'gram' : undefined,
        },
        currentPrice: parseFloat(form.currentPrice) || 0,
        lastPriceUpdate: null,
        createdAt: new Date(),
      })

      toast.success('Aset berhasil ditambahkan')
      onAdded()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Gagal menambahkan aset')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            {step === 'type' ? 'Pilih Tipe Aset' : 'Detail Aset'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {step === 'type' && (
          <div className="p-4 space-y-2">
            {ASSET_TYPES.map(({ type, label, icon, desc }) => (
              <button
                key={type}
                onClick={() => { setSelectedType(type); setStep('detail') }}
                className="w-full flex items-center gap-3 p-3.5 border border-slate-200 rounded-xl hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98] transition-all text-left"
              >
                <span className="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-lg text-slate-600 shrink-0">
                  {icon}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{label}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
                <ChevronRight size={14} className="text-slate-300" />
              </button>
            ))}
          </div>
        )}

        {step === 'detail' && selectedType && (
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            <button
              type="button"
              onClick={() => setStep('type')}
              className="text-xs text-slate-400 flex items-center gap-1 mb-1"
            >
              ← Ganti tipe
            </button>

            <Field label="Nama Aset" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder={
                  selectedType === 'saham' ? 'Bank Central Asia'
                  : selectedType === 'rdpu' ? 'BRI Seruni Pasar Uang III'
                  : 'Nama aset'
                }
                className={inputClass}
                required
              />
            </Field>

            <Field label="Platform" required>
              <input
                type="text"
                value={form.platform}
                onChange={(e) => set('platform', e.target.value)}
                placeholder={
                  selectedType === 'saham' ? 'Stockbit / Ajaib'
                  : selectedType === 'rdpu' ? 'Bibit'
                  : selectedType === 'emas' ? 'Tring Pegadaian'
                  : 'Nama platform'
                }
                className={inputClass}
                required
              />
            </Field>

            {(selectedType === 'saham' || selectedType === 'etf') && (
              <Field label="Kode Ticker" hint="cth. BBCA, IDX30.JK, SPY">
                <input
                  type="text"
                  value={form.ticker}
                  onChange={(e) => set('ticker', e.target.value)}
                  placeholder="BBCA"
                  className={inputClass}
                />
              </Field>
            )}

            <Field
              label={
                selectedType === 'saham' ? 'Jumlah Lot'
                : selectedType === 'emas' ? 'Jumlah (gram)'
                : selectedType === 'rdpu' ? 'Jumlah Unit'
                : 'Jumlah'
              }
              required
            >
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
            </Field>

            <Field label="Total Modal (Rp)" hint="Total uang yang diinvestasikan" required>
              <input
                type="number"
                value={form.costBasis}
                onChange={(e) => set('costBasis', e.target.value)}
                placeholder="0"
                min="0"
                className={inputClass}
                required
              />
            </Field>

            <Field
              label={
                selectedType === 'saham' ? 'Harga per Lembar (Rp)'
                : selectedType === 'emas' ? 'Harga per Gram (Rp)'
                : selectedType === 'rdpu' ? 'NAV per Unit (Rp)'
                : 'Harga Sekarang'
              }
              hint="Opsional — akan di-fetch otomatis"
            >
              <input
                type="number"
                value={form.currentPrice}
                onChange={(e) => set('currentPrice', e.target.value)}
                placeholder="0"
                min="0"
                className={inputClass}
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {loading ? 'Menyimpan...' : 'Simpan Aset'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder:text-slate-400'

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {label}
        {required && <span className="text-rose-400 ml-0.5">*</span>}
        {hint && <span className="font-normal text-slate-400 ml-1">· {hint}</span>}
      </label>
      {children}
    </div>
  )
}
