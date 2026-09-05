import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { saveGroup } from '../lib/sync'
import { newMember } from '../lib/group'

export default function MembersSheet({ group, me, onClose }) {
  const [names, setNames] = useState(
    Object.fromEntries(group.members.map((m) => [m.id, m.name]))
  )
  const [newName, setNewName] = useState('')

  const expenses = useLiveQuery(
    () => db.expenses.where('group_id').equals(group.id).toArray(),
    [group.id]
  )

  // members referenced by any non-deleted expense can't be removed
  const referenced = new Set()
  for (const e of expenses ?? []) {
    if (e.deleted) continue
    for (const p of e.paid_by ?? []) referenced.add(p.member)
    for (const s of e.split ?? []) referenced.add(s.member)
  }

  const rename = async (id, name) => {
    setNames((n) => ({ ...n, [id]: name }))
  }

  const commitRename = async (id) => {
    const name = (names[id] ?? '').trim()
    if (!name) return
    await saveGroup({
      ...group,
      members: group.members.map((m) => (m.id === id ? { ...m, name } : m)),
    })
  }

  const add = async () => {
    const name = newName.trim()
    if (!name) return
    const member = newMember(name, group.members.length)
    await saveGroup({ ...group, members: [...group.members, member] })
    setNames((n) => ({ ...n, [member.id]: name }))
    setNewName('')
  }

  const remove = async (id) => {
    if (referenced.has(id) || id === me) return
    if (!confirm('Remove this member?')) return
    await saveGroup({ ...group, members: group.members.filter((m) => m.id !== id) })
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-4 rounded-t-3xl border-t border-line bg-panel p-6 sm:rounded-3xl sm:border"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">Members</h2>
          <button onClick={onClose} className="text-2xl leading-none text-fog">×</button>
        </div>

        <div className="flex flex-col gap-2">
          {group.members.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: m.color }}>
                {(names[m.id] || m.name)[0]?.toUpperCase()}
              </span>
              <input
                value={names[m.id] ?? ''}
                onChange={(e) => rename(m.id, e.target.value)}
                onBlur={() => commitRename(m.id)}
                className="flex-1 rounded-xl bg-panel-2 px-3 py-2.5 text-sm outline-none"
              />
              {m.id === me ? (
                <span className="px-2 text-[10px] uppercase text-fog">you</span>
              ) : referenced.has(m.id) ? (
                <span className="px-2 text-[10px] uppercase text-fog" title="Has expenses">locked</span>
              ) : (
                <button onClick={() => remove(m.id)} className="px-2 text-lg text-fog">×</button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Add member"
            className="flex-1 rounded-xl bg-panel-2 px-3 py-2.5 text-sm outline-none placeholder:text-fog"
          />
          <button onClick={add} disabled={!newName.trim()} className="rounded-xl bg-panel-2 px-4 py-2.5 text-sm font-semibold text-mist disabled:opacity-30">
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
