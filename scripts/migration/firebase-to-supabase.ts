/* eslint-disable no-console */
import admin from 'firebase-admin'
import { createClient } from '@supabase/supabase-js'
import collections, { type CollectionConfig } from './config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
const batchSize = Number(process.env.MIGRATION_BATCH_SIZE || 500)

if (!supabaseUrl || !serviceRole) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
}

const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

if (!projectId || !clientEmail || !privateKey) {
  throw new Error('Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY')
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  }),
  ...(process.env.FIREBASE_DATABASE_URL ? { databaseURL: process.env.FIREBASE_DATABASE_URL } : {}),
  ...(process.env.FIREBASE_STORAGE_BUCKET ? { storageBucket: process.env.FIREBASE_STORAGE_BUCKET } : {}),
})

const firestore = admin.firestore()
const supabase = createClient(supabaseUrl, serviceRole)

function serializeFirestore(value: any): any {
  if (value === null || value === undefined) return value
  // Firestore Timestamp
  // @ts-ignore
  if (typeof value?.toDate === 'function') return value.toDate().toISOString()
  if (Array.isArray(value)) return value.map(serializeFirestore)
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, serializeFirestore(v)]),
    )
  }
  return value
}

function getStoreIdFromDoc(doc: FirebaseFirestore.QueryDocumentSnapshot): string | undefined {
  try {
    // Expected path: stores/{storeId}/{subcoll}/{docId}
    const parent = (doc.ref.parent as any)
    const storeDoc = parent?.parent
    return storeDoc?.id
  } catch {
    return undefined
  }
}

async function migrateCollection(cfg: CollectionConfig) {
  console.log(`Migrating ${cfg.source} -> ${cfg.target}`)
  const snap = cfg.collectionGroup
    ? await firestore.collectionGroup(cfg.source).get()
    : await firestore.collection(cfg.source).get()
  console.log(`  Found ${snap.size} docs`)

  const rows = snap.docs.map((doc) => {
    const data = serializeFirestore(doc.data())
    const base = cfg.withStoreId ? { store_id: getStoreIdFromDoc(doc) } : {}
    const row = { ...base, ...cfg.transform({ id: doc.id, data }) }
    if (cfg.idField && row[cfg.idField] === undefined) {
      row[cfg.idField] = doc.id
    }
    return row
  })

  const size = rows.length
  const chunk = cfg.chunkSize ?? batchSize

  for (let i = 0; i < size; i += chunk) {
    const part = rows.slice(i, i + chunk)
    const query = cfg.upsertOn?.length
      ? supabase.from(cfg.target).upsert(part, { onConflict: cfg.upsertOn.join(',') })
      : supabase.from(cfg.target).insert(part)

    const { error } = await query
    if (error) {
      console.error(`  Error at batch ${i}-${i + part.length}:`, error.message)
      throw error
    }
    console.log(`  Inserted ${Math.min(i + part.length, size)}/${size}`)
  }
}

async function main() {
  for (const cfg of collections) {
    await migrateCollection(cfg)
  }
  console.log('Migration completed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
