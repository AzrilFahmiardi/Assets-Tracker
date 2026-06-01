import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Asset, Transaction, PortfolioHistoryEntry } from '@/types/asset'

// ─── Assets ───────────────────────────────────────────────────────────────

export async function getAssets(): Promise<Asset[]> {
  const snap = await getDocs(query(collection(db, 'assets'), orderBy('createdAt', 'asc')))
  return snap.docs.map((d) => firestoreToAsset(d.id, d.data()))
}

export async function getAsset(id: string): Promise<Asset | null> {
  const snap = await getDoc(doc(db, 'assets', id))
  if (!snap.exists()) return null
  return firestoreToAsset(snap.id, snap.data())
}

export async function addAsset(asset: Omit<Asset, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'assets'), assetToFirestore(asset))
  return ref.id
}

export async function updateAsset(id: string, data: Partial<Asset>): Promise<void> {
  await updateDoc(doc(db, 'assets', id), assetToFirestore(data))
}

export async function deleteAsset(id: string): Promise<void> {
  await deleteDoc(doc(db, 'assets', id))
}

// ─── Transactions ─────────────────────────────────────────────────────────

export async function getTransactions(assetId: string): Promise<Transaction[]> {
  const snap = await getDocs(
    query(collection(db, 'transactions'), orderBy('date', 'desc'))
  )
  return snap.docs
    .map((d) => firestoreToTransaction(d.id, d.data()))
    .filter((t) => t.assetId === assetId)
}

export async function addTransaction(tx: Omit<Transaction, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'transactions'), {
    ...tx,
    date: Timestamp.fromDate(new Date(tx.date)),
  })
  return ref.id
}

// ─── Portfolio History ─────────────────────────────────────────────────────

export async function getPortfolioHistory(): Promise<PortfolioHistoryEntry[]> {
  const snap = await getDocs(query(collection(db, 'portfolioHistory'), orderBy('date', 'asc')))
  return snap.docs.map((d) => d.data() as PortfolioHistoryEntry)
}

export async function savePortfolioSnapshot(entry: PortfolioHistoryEntry): Promise<void> {
  await setDoc(doc(db, 'portfolioHistory', entry.date), entry)
}

// ─── Converters ───────────────────────────────────────────────────────────

function firestoreToAsset(id: string, data: Record<string, unknown>): Asset {
  return {
    id,
    name: data.name as string,
    type: data.type as Asset['type'],
    platform: data.platform as string,
    quantity: data.quantity as number,
    costBasis: data.costBasis as number,
    priceSource: data.priceSource as Asset['priceSource'],
    metadata: (data.metadata as Asset['metadata']) ?? {},
    currentPrice: (data.currentPrice as number) ?? 0,
    lastPriceUpdate: data.lastPriceUpdate
      ? (data.lastPriceUpdate as Timestamp).toDate()
      : null,
    createdAt: data.createdAt
      ? (data.createdAt as Timestamp).toDate()
      : new Date(),
  }
}

function firestoreToTransaction(id: string, data: Record<string, unknown>): Transaction {
  return {
    id,
    assetId: data.assetId as string,
    type: data.type as Transaction['type'],
    date: (data.date as Timestamp).toDate(),
    quantity: data.quantity as number,
    pricePerUnit: data.pricePerUnit as number,
    totalAmount: data.totalAmount as number,
    notes: (data.notes as string) ?? '',
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function assetToFirestore(data: Partial<Asset>): Record<string, any> {
  const result: Record<string, unknown> = { ...data }
  if (data.lastPriceUpdate) {
    result.lastPriceUpdate = Timestamp.fromDate(new Date(data.lastPriceUpdate))
  }
  if (data.createdAt) {
    result.createdAt = Timestamp.fromDate(new Date(data.createdAt))
  }
  delete result.id
  return result
}
