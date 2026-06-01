'use client'

import { useState } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { addAsset } from '@/lib/firestore'
import type { AssetType, PriceSource } from '@/types/asset'
import toast from 'react-hot-toast'

interface Props {
  onClose: () => void
  onAdded: () => void
}

const ASSET_TYPES: { type: AssetType; label: string; emoji: string }[] = [
  { type: 'saham', label: 'Saham IDX', emoji: '📈' },
  { type: 'rdpu', label: 'Reksa Dana', emoji: '🏦' },
  { type: 'emas', label: 'Emas', emoji: '🥇' },
  { type: 'crypto', label: 'Kripto', emoji: '₿' },
  { type: 'etf', label: 'ETF', emoji: '🌐' },
  { type: 'other', label: 'Lainnya', emoji: '💼' },
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
      <div className="relative w-full bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            {step === 'type' ? 'Pilih Tipe Aset' : 'Detail Aset'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {step === 'type' && (
          <div className="p-5 grid grid-cols-2 gap-3">
            {ASSET_TYPES.map(({ type, label, emoji }) => (
              <button
                key={type}
                onClick={() => {
                  setSelectedType(type)
                  setStep('detail')
                }}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-2xl hover:border-gray-400 active:scale-95 transition-all text-left"
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-sm font-medium text-gray-800">{label}</span>
                <ChevronRight size={14} className="ml-auto text-gray-300" />
              </button>
            ))}
          </div>
        )}

        {step === 'detail' && selectedType && (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <button
              type="button"
              onClick={() => setStep('type')}
              className="text-xs text-gray-400 flex items-center gap-1"
            >
              ← Ganti tipe
            </button>

            <Field label="Nama Aset" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder={
                  selectedType === 'saham'
                    ? 'cth. Bank Central Asia'
                    : selectedType === 'rdpu'
                      ? 'cth. BRI Seruni Pasar Uang III'
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
                  selectedType === 'saham'
                    ? 'cth. Stockbit'
                    : selectedType === 'rdpu'
                      ? 'cth. Bibit'
                      : selectedType === 'emas'
                        ? 'cth. Tring Pegadaian'
                        : 'Nama platform/broker'
                }
                className={inputClass}
                required
              />
            </Field>

            {(selectedType === 'saham' || selectedType === 'etf') && (
              <Field label="Kode Saham / Ticker" hint="Contoh: BBCA, BMRI, IDX30.JK">
                <input
                  type="text"
                  value={form.ticker}
                  onChange={(e) => set('ticker', e.target.value)}
                  placeholder="BBCA"
                  className={inputClass}
                />
              </Field>
            )}

            {selectedType === 'saham' && (
              <Field label="Jumlah Lot" required>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => set('quantity', e.target.value)}
                  placeholder="10"
                  min="0"
                  step="1"
                  className={inputClass}
                  required
                />
              </Field>
            )}

            {selectedType === 'emas' && (
              <Field label="Jumlah (gram)" required>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => set('quantity', e.target.value)}
                  placeholder="0.1"
                  min="0"
                  step="0.001"
                  className={inputClass}
                  required
                />
              </Field>
            )}

            {selectedType === 'rdpu' && (
              <Field label="Jumlah Unit" required>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => set('quantity', e.target.value)}
                  placeholder="7500.1234"
                  min="0"
                  step="0.0001"
                  className={inputClass}
                  required
                />
              </Field>
            )}

            {(selectedType === 'crypto' || selectedType === 'other') && (
              <Field label="Jumlah" required>
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
            )}

            <Field label="Total Modal (Rp)" hint="Total uang yang sudah diinvestasikan" required>
              <input
                type="number"
                value={form.costBasis}
                onChange={(e) => set('costBasis', e.target.value)}
                placeholder="7870458"
                min="0"
                className={inputClass}
                required
              />
            </Field>

            <Field
              label={
                selectedType === 'saham'
                  ? 'Harga Saham Sekarang (Rp/lembar)'
                  : selectedType === 'emas'
                    ? 'Harga Emas Sekarang (Rp/gram)'
                    : selectedType === 'rdpu'
                      ? 'NAV Sekarang (Rp/unit)'
                      : 'Harga Sekarang'
              }
              hint="Opsional — app akan fetch otomatis saat dibuka"
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
              className="w-full py-3.5 bg-gray-900 text-white rounded-2xl font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
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
  'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-gray-50'

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
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
        {hint && <span className="font-normal text-gray-400 ml-1">· {hint}</span>}
      </label>
      {children}
    </div>
  )
}
