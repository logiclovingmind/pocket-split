import Dexie from 'dexie'

export const db = new Dexie('pocket-split')

// v1 was the old pool-ledger `entries` table. v2 pivots to a Splitwise-style
// model: many groups per room, each group holding expenses. `entries` is dropped.
db.version(1).stores({
  entries: 'id, room, updated_at, [room+happened_at]',
  outbox: 'id',
  meta: 'key',
})

db.version(2).stores({
  entries: null,
  groups: 'id, room, updated_at',
  expenses: 'id, room, group_id, updated_at, [group_id+happened_at]',
  outbox: 'id', // { id, table }
  meta: 'key',
})

export const SYNCED_TABLES = ['groups', 'expenses']

export async function getCursor(table, room) {
  const row = await db.meta.get(`cursor:${table}:${room}`)
  return row?.value ?? '1970-01-01T00:00:00.000Z'
}

export async function setCursor(table, room, value) {
  await db.meta.put({ key: `cursor:${table}:${room}`, value })
}
