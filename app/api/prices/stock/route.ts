import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker')
  if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 })

  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
      next: { revalidate: 1800 }, // cache 30 menit
    })

    if (!res.ok) throw new Error(`Yahoo Finance responded ${res.status}`)

    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta
    if (!meta) throw new Error('Unexpected Yahoo Finance response shape')

    const price: number =
      meta.regularMarketPrice ?? meta.previousClose ?? meta.chartPreviousClose

    return NextResponse.json({ ticker, price, currency: meta.currency ?? 'IDR' })
  } catch (err) {
    console.error('[prices/stock]', err)
    return NextResponse.json({ error: 'Gagal fetch harga saham' }, { status: 502 })
  }
}
