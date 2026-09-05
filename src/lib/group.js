import { saveGroup } from './sync'

export const MEMBER_COLORS = [
  '#ff2e63', '#a855f7', '#22d3ee', '#f59e0b',
  '#34d399', '#f472b6', '#60a5fa', '#facc15',
]

export function memberColor(members, index) {
  return MEMBER_COLORS[index % MEMBER_COLORS.length]
}

export function newMember(name, index = 0) {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    color: MEMBER_COLORS[index % MEMBER_COLORS.length],
  }
}

export function newGroup(room, name, memberNames, currency = 'INR') {
  return {
    id: crypto.randomUUID(),
    room,
    name: name.trim(),
    members: memberNames.filter((n) => n.trim()).map((n, i) => newMember(n, i)),
    currency,
    deleted: false,
  }
}

export async function createGroup(room, name, memberNames, currency) {
  const group = newGroup(room, name, memberNames, currency)
  await saveGroup(group)
  return group
}

export const memberName = (group, id) =>
  group?.members.find((m) => m.id === id)?.name ?? '—'

export const memberById = (group, id) =>
  group?.members.find((m) => m.id === id)

// Splitwise-style categories with an emoji glyph each.
export const CATEGORIES = [
  { id: 'general', label: 'General', icon: '🧾' },
  { id: 'groceries', label: 'Groceries', icon: '🛒' },
  { id: 'food', label: 'Food & drink', icon: '🍽️' },
  { id: 'transport', label: 'Transport', icon: '🚕' },
  { id: 'rent', label: 'Rent', icon: '🏠' },
  { id: 'utilities', label: 'Utilities', icon: '💡' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️' },
  { id: 'entertainment', label: 'Fun', icon: '🎬' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'health', label: 'Health', icon: '💊' },
]

export const categoryIcon = (id) =>
  CATEGORIES.find((c) => c.id === id)?.icon ?? '🧾'
