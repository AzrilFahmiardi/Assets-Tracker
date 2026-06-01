import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

async function fetchFromOJK(fundName: string): Promise<number | null> {
  try {
    const encoded = encodeURIComponent(fundName)
    const res = await fetch(
      `https://reksadana.ojk.go.id/Public/ReksaDanaPublic.aspx?search=${encoded}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html',
        },
        next: { revalidate: 64800 }, // cache 18 jam
      }
    )
    if (!res.ok) return null

    const html = await res.text()
    const $ = cheerio.load(html)

    // Cari NAV dari tabel hasil pencarian
    let nav: number | null = null
    $('table tr').each((_, row) => {
      const cells = $(row).find('td')
      if (cells.length >= 3) {
        const name = $(cells[0]).text().toLowerCase()
        if (name.includes(fundName.toLowerCase().split(' ')[0].toLowerCase())) {
          const raw = $(cells[2]).text().replace(/[^0-9,.]/g, '')
          const parsed = parseFloat(raw.replace(',', '.'))
          if (!isNaN(parsed) && parsed > 100) {
            nav = parsed
            return false
          }
        }
      }
    })
    return nav
  } catch {
    return null
  }
}

async function fetchFromBareksa(fundName: string): Promise<number | null> {
  try {
    const slug = fundName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    const res = await fetch(`https://www.bareksa.com/reksa-dana/${slug}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html',
      },
      next: { revalidate: 64800 },
    })
    if (!res.ok) return null

    const html = await res.text()
    const $ = cheerio.load(html)

    let nav: number | null = null
    $('*').each((_, el) => {
      const text = $(el).text().trim()
      // Cari pola NAV (angka dengan koma desimal, umumnya 1000-2000 untuk pasar uang)
      const match = text.match(/NAV[^0-9]*([0-9]{1,4}[.,][0-9]{2,4})/i)
      if (match) {
        nav = parseFloat(match[1].replace(',', '.'))
        return false
      }
    })
    return nav
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const fundName = req.nextUrl.searchParams.get('name')
  if (!fundName) return NextResponse.json({ error: 'name required' }, { status: 400 })

  let nav = await fetchFromOJK(fundName)
  let source = 'ojk'

  if (!nav) {
    nav = await fetchFromBareksa(fundName)
    source = 'bareksa'
  }

  if (!nav) {
    return NextResponse.json(
      { error: 'NAV tidak bisa diambil otomatis', requiresManual: true },
      { status: 502 }
    )
  }

  return NextResponse.json({ nav, currency: 'IDR', source })
}
