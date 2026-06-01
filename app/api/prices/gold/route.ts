import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

async function fetchAntamPrice(): Promise<number | null> {
  try {
    const res = await fetch('https://www.logammulia.com/id/harga-emas-hari-ini', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html',
      },
      next: { revalidate: 43200 }, // cache 12 jam
    })
    if (!res.ok) return null

    const html = await res.text()
    const $ = cheerio.load(html)

    // Cari tabel harga — kolom "1 gram" baris "Harga Jual"
    let price: number | null = null
    $('table tr').each((_, row) => {
      const cells = $(row).find('td')
      const label = $(cells[0]).text().trim().toLowerCase()
      if (label.includes('1') || label.includes('gram')) {
        const raw = $(cells[1]).text().replace(/[^0-9]/g, '')
        const parsed = parseInt(raw, 10)
        if (!isNaN(parsed) && parsed > 100000) {
          price = parsed
          return false // break
        }
      }
    })

    // Fallback: cari angka besar pertama dalam konteks "1 gr"
    if (!price) {
      const text = $('body').text()
      const match = text.match(/1\s*gr[^0-9]*([0-9]{3}[.,][0-9]{3})/i)
      if (match) {
        price = parseInt(match[1].replace(/[.,]/g, ''), 10)
      }
    }

    return price
  } catch {
    return null
  }
}

async function fetchPegadaianPrice(): Promise<number | null> {
  try {
    const res = await fetch('https://www.pegadaian.co.id/produk/tabungan-emas', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html',
      },
      next: { revalidate: 43200 },
    })
    if (!res.ok) return null

    const html = await res.text()
    const $ = cheerio.load(html)

    let price: number | null = null
    $('*').each((_, el) => {
      const text = $(el).text()
      // Cari pola harga per gram (angka 6-7 digit)
      const match = text.match(/Rp\.?\s*([0-9]{2,3}[.,][0-9]{3})\s*\/\s*gram/i)
      if (match) {
        price = parseInt(match[1].replace(/[.,]/g, ''), 10)
        return false
      }
    })

    return price
  } catch {
    return null
  }
}

export async function GET() {
  let price = await fetchAntamPrice()
  let source = 'antam'

  if (!price) {
    price = await fetchPegadaianPrice()
    source = 'pegadaian'
  }

  if (!price) {
    return NextResponse.json(
      { error: 'Tidak bisa fetch harga emas otomatis, update manual diperlukan' },
      { status: 502 }
    )
  }

  return NextResponse.json({ price, unit: 'gram', currency: 'IDR', source })
}
