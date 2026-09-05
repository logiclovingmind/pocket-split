const ROOM_KEY = 'ledger_room'

// Installed PWAs launch at "/" without the ?room= param, so remember the
// last room and fall back to it.
export function getRoom() {
  const fromUrl = new URLSearchParams(window.location.search).get('room')
  if (fromUrl) {
    localStorage.setItem(ROOM_KEY, fromUrl)
    return fromUrl
  }
  return localStorage.getItem(ROOM_KEY)
}

export function createRoom() {
  const id = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll('-', '')
  enterRoom(id)
}

// Accepts a full shared link or a bare room id. Returns false if unusable.
export function joinRoom(input) {
  const text = input.trim()
  if (!text) return false
  let id = text
  try {
    const fromLink = new URL(text).searchParams.get('room')
    if (fromLink) id = fromLink
  } catch {
    // not a URL — treat as a bare room id
  }
  if (!/^[a-zA-Z0-9-]{16,}$/.test(id)) return false
  enterRoom(id)
  return true
}

function enterRoom(id) {
  localStorage.setItem(ROOM_KEY, id)
  const params = new URLSearchParams(window.location.search)
  params.set('room', id)
  window.location.search = params.toString()
}

export function roomLink(room) {
  return `${window.location.origin}${window.location.pathname}?room=${room}`
}

// --- "who am I" is chosen per group (a person is a member of each group) ---
const mineKey = (groupId) => `ps_me:${groupId}`

export function getMe(groupId) {
  return localStorage.getItem(mineKey(groupId))
}

export function setMe(groupId, memberId) {
  localStorage.setItem(mineKey(groupId), memberId)
}
