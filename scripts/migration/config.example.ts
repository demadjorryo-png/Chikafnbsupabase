export type TransformArg = { id: string; data: any }

export type CollectionConfig = {
  source: string
  target: string
  idField?: string
  upsertOn?: string[]
  chunkSize?: number
  collectionGroup?: boolean
  // For nested subcollections, extract store_id from path
  // If provided, will set `store_id` in transform helper
  withStoreId?: boolean
  transform: (doc: TransformArg) => Record<string, any>
}

export const collections: CollectionConfig[] = [
  {
    source: 'users',
    target: 'profiles',
    idField: 'id',
    upsertOn: ['id'],
    transform: ({ id, data }) => ({
      id,
      email: data.email ?? null,
      display_name: data.displayName ?? data.name ?? null,
      avatar_url: data.avatarUrl ?? null,
      created_at: data.createdAt
        ? new Date(data.createdAt).toISOString()
        : new Date().toISOString(),
    }),
  },
  {
    source: 'posts',
    target: 'posts',
    upsertOn: ['id'],
    transform: ({ id, data }) => ({
      id,
      user_id: data.userId,
      title: data.title,
      content: data.content ?? null,
      created_at: data.createdAt
        ? new Date(data.createdAt).toISOString()
        : new Date().toISOString(),
    }),
  },
]

// Duplikasi file ini menjadi `config.ts` dan sesuaikan mappingnya.
export default collections
