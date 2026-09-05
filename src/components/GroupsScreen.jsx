import { useState } from 'react'
import { createGroup } from '../lib/group'
import { CURRENCIES } from '../lib/format'
import { roomLink } from '../lib/room'
import SyncDot from './SyncDot'

function CreateGroupSheet({ room, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [members, setMembers] = useState(['', ''])
  const [currency, setCurrency] = useState('INR')

  const setMember = (i, v) =>
    setMembers((m) => m.map((x, j) => (j === i ? v : x)))
  const addMember = () => setMembers((m) => [...m, ''])
  const removeMember = (i) => setMembers((m) => m.filter((_, j) => j !== i))

  const named = members.map((m) => m.trim()).filter(Boolean)
  const valid = name.trim() && named.length >= 2

  const submit = async (e) => {
    e.preventDefault()
    if (!valid) return
    const group = await createGroup(room, name, named, currency)
    onCreated(group.id)
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-4 rounded-t-3xl border-t border-line bg-panel p-6 sm:rounded-3xl sm:border"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">New group</h2>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-fog">×</button>
        </div>

        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name — e.g. Bangalore flat"
          className="rounded-xl bg-panel-2 px-4 py-3 text-sm outline-none placeholder:text-fog"
        />

        <div className="flex flex-col gap-2">
          <p className="px-1 text-[10px] uppercase tracking-wider text-fog">Members</p>
          {members.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={m}
                onChange={(e) => setMember(i, e.target.value)}
                placeholder={`Person ${i + 1}`}
                className="flex-1 rounded-xl bg-panel-2 px-4 py-2.5 text-sm outline-none placeholder:text-fog"
              />
              {members.length > 2 && (
                <button type="button" onClick={() => removeMember(i)} className="px-2 text-lg text-fog">×</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addMember} className="self-start rounded-full bg-panel-2 px-3 py-1.5 text-xs font-semibold text-mist">
            + Add member
          </button>
        </div>

        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="rounded-xl bg-panel-2 px-3 py-3 text-sm text-mist outline-none"
        >
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <button
          type="submit"
          disabled={!valid}
          className="rounded-xl bg-linear-to-r from-pink via-violet to-cyan py-3.5 font-semibold text-white transition-opacity disabled:opacity-30"
        >
          Create group
        </button>
      </form>
    </div>
  )
}

export default function GroupsScreen({ room, groups, onOpen }) {
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)

  const share = async () => {
    const link = roomLink(room)
    try {
      if (navigator.share) await navigator.share({ url: link, title: 'Pocket Split' })
      else {
        await navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }
    } catch {
      /* user dismissed share sheet */
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pb-28">
      <header className="flex items-center justify-between pt-6 pb-2">
        <h1 className="font-heading text-lg font-bold tracking-tight">
          Pocket{' '}
          <span className="bg-linear-to-r from-pink via-violet to-cyan bg-clip-text text-transparent">Split</span>
        </h1>
        <div className="flex items-center gap-3">
          <SyncDot />
          <button onClick={share} className="rounded-full bg-panel px-3 py-1.5 text-xs font-semibold text-mist">
            {copied ? 'Copied!' : 'Share link'}
          </button>
        </div>
      </header>

      <main className="flex flex-col gap-3 pt-4">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-fog">Your groups</h2>
        {groups.length === 0 ? (
          <p className="rounded-xl bg-panel px-4 py-8 text-center text-sm text-fog">
            No groups yet. Create one to start splitting.
          </p>
        ) : (
          groups
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((g) => (
              <button
                key={g.id}
                onClick={() => onOpen(g.id)}
                className="flex w-full items-center justify-between rounded-2xl border border-line bg-panel px-5 py-4 text-left transition-colors active:bg-panel-2"
              >
                <div>
                  <p className="font-heading text-base font-semibold">{g.name}</p>
                  <p className="mt-0.5 text-xs text-fog">
                    {g.members.length} members · {g.currency}
                  </p>
                </div>
                <div className="flex -space-x-2">
                  {g.members.slice(0, 4).map((m) => (
                    <span
                      key={m.id}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-ink text-[10px] font-bold text-white"
                      style={{ background: m.color }}
                    >
                      {m.name[0]?.toUpperCase()}
                    </span>
                  ))}
                </div>
              </button>
            ))
        )}
      </main>

      <button
        onClick={() => setCreating(true)}
        aria-label="New group"
        className="fixed right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-pink via-violet to-cyan text-2xl font-bold text-white shadow-lg shadow-violet/30 active:scale-95"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
      >
        +
      </button>

      {creating && (
        <CreateGroupSheet
          room={room}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false)
            onOpen(id)
          }}
        />
      )}
    </div>
  )
}
