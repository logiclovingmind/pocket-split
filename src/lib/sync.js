import { db, getCursor, setCursor, SYNCED_TABLES } from './db'
import { supabase, hasSupabase } from './supabase'

// --- sync status store (for the offline dot) ---
let status = navigator.onLine ? 'synced' : 'offline'
const listeners = new Set()

function setStatus(next) {
  if (status === next) return
  status = next
  listeners.forEach((fn) => fn())
}

export function subscribeStatus(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getStatus() {
  return status
}

async function refreshStatus() {
  if (!navigator.onLine) return setStatus('offline')
  const queued = await db.outbox.count()
  setStatus(queued > 0 ? 'queued' : 'synced')
}

// --- write path: local first, then queue ---
export async function saveRow(table, row) {
  const now = new Date().toISOString()
  const stored = { ...row, updated_at: now }
  await db.transaction('rw', db[table], db.outbox, async () => {
    await db[table].put(stored)
    await db.outbox.put({ id: stored.id, table })
  })
  refreshStatus()
  flushOutbox()
  return stored
}

export async function softDeleteRow(table, id) {
  const existing = await db[table].get(id)
  if (existing) await saveRow(table, { ...existing, deleted: true })
}

// convenience wrappers
export const saveGroup = (g) => saveRow('groups', g)
export const saveExpense = (e) => saveRow('expenses', e)
export const deleteExpense = (id) => softDeleteRow('expenses', id)

// --- push queued rows to supabase ---
let flushing = false
export async function flushOutbox() {
  if (!hasSupabase || flushing || !navigator.onLine) return
  flushing = true
  try {
    const queued = await db.outbox.toArray()
    for (const item of queued) {
      const table = item.table ?? 'expenses'
      const row = await db[table].get(item.id)
      if (!row) {
        await db.outbox.delete(item.id)
        continue
      }
      const { created_at, ...payload } = row
      const { error } = await supabase.from(table).upsert(payload)
      if (error) break
      await db.outbox.delete(item.id)
    }
  } finally {
    flushing = false
    refreshStatus()
  }
}

// --- pull: newer-than-cursor rows, last-write-wins merge ---
async function mergeRemote(table, rows) {
  if (!rows?.length) return
  const queuedIds = new Set((await db.outbox.toArray()).map((r) => r.id))
  await db.transaction('rw', db[table], async () => {
    for (const remote of rows) {
      const local = await db[table].get(remote.id)
      const localWins =
        local &&
        (queuedIds.has(remote.id)
          ? local.updated_at >= remote.updated_at
          : local.updated_at > remote.updated_at)
      if (!localWins) await db[table].put(remote)
    }
  })
}

async function pullTable(table, room) {
  const cursor = await getCursor(table, room)
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('room', room)
    .gt('updated_at', cursor)
    .order('updated_at', { ascending: true })
  if (error || !data) return
  await mergeRemote(table, data)
  if (data.length) await setCursor(table, room, data[data.length - 1].updated_at)
}

export async function pull(room) {
  if (!hasSupabase || !navigator.onLine) return
  for (const table of SYNCED_TABLES) await pullTable(table, room)
  refreshStatus()
}

// --- init: pull on load, realtime subscribe, flush on reconnect ---
export function initSync(room) {
  if (!hasSupabase) {
    setStatus('offline')
    return () => {}
  }

  pull(room)
  flushOutbox()

  const channels = SYNCED_TABLES.map((table) =>
    supabase
      .channel(`${table}:${room}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `room=eq.${room}` },
        (payload) => {
          if (payload.new?.id) mergeRemote(table, [payload.new])
        }
      )
      .subscribe()
  )

  const onOnline = () => {
    refreshStatus()
    flushOutbox()
    pull(room)
  }
  const onOffline = () => setStatus('offline')
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)

  return () => {
    channels.forEach((c) => supabase.removeChannel(c))
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}
