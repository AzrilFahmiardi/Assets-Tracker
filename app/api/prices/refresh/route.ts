// Route ini tidak dipakai langsung — price refresh dilakukan client-side
// melalui /api/prices/stock, /api/prices/gold, /api/prices/rdpu
// lalu client update Firestore langsung via SDK

export async function GET() {
  return Response.json({ message: 'Use individual price endpoints' })
}
