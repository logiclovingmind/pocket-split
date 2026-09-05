import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { memberBalances, balanceSummary, groupTotal } from '../lib/balances'
import { formatMoney } from '../lib/format'
import ExpenseSheet from './ExpenseSheet'
import ExpenseList from './ExpenseList'
import BalancesPanel from './BalancesPanel'
import MembersSheet from './MembersSheet'
import SyncDot from './SyncDot'

export default function GroupView({ group, me, onLeave }) {
  const [tab, setTab] = useState('expenses')
  const [sheet, setSheet] = useState(null) // null | 'new' | expense
  const [settlePreset, setSettlePreset] = useState(null)
  const [showMembers, setShowMembers] = useState(false)

  const expenses = useLiveQuery(
    () => db.expenses.where('group_id').equals(group.id).toArray(),
    [group.id]
  )

  const memberIds = group.members.map((m) => m.id)
  const live = useMemo(() => (expenses ?? []).filter((e) => !e.deleted), [expenses])
  const net = useMemo(() => memberBalances(live, memberIds), [live, memberIds])
  const summary = balanceSummary(net, me)
  const total = groupTotal(live)

  if (!expenses) return null

  const startSettle = (preset) => {
    setSettlePreset(preset)
    setSheet('settle')
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pb-28">
      <header className="flex items-center justify-between pt-6 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <button onClick={onLeave} aria-label="Back" className="text-xl text-fog">‹</button>
          <h1 className="truncate font-heading text-lg font-bold tracking-tight">{group.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <SyncDot />
          <button onClick={() => setShowMembers(true)} className="rounded-full bg-panel px-3 py-1.5 text-xs font-semibold text-mist">
            Members
          </button>
        </div>
      </header>

      <section className="mt-3 rounded-3xl border border-line bg-panel px-6 py-7 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-fog">
          {summary.positive ? 'You are owed' : summary.negative ? 'You owe' : 'You are settled up'}
        </p>
        <p
          className={`font-hero mt-3 text-5xl font-bold tracking-tight ${
            summary.positive ? 'text-emerald-400' : summary.negative ? 'text-pink' : 'text-mist'
          }`}
        >
          {formatMoney(Math.abs(summary.mine), group.currency)}
        </p>
        <p className="mt-3 text-xs text-fog">
          {group.members.length} members · {formatMoney(total, group.currency)} total spent
        </p>
      </section>

      <nav className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-panel p-1 text-sm">
        {[['expenses', 'Expenses'], ['balances', 'Balances']].map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full py-2 font-semibold transition-colors ${
              tab === t ? 'bg-panel-2 text-cyan' : 'text-fog'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'expenses' ? (
        <ExpenseList group={group} me={me} expenses={live} onEdit={setSheet} />
      ) : (
        <BalancesPanel group={group} me={me} net={net} onSettle={startSettle} />
      )}

      <button
        onClick={() => setSheet('new')}
        aria-label="Add expense"
        className="fixed right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-pink via-violet to-cyan text-2xl font-bold text-white shadow-lg shadow-violet/30 active:scale-95"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
      >
        +
      </button>

      {sheet && (
        <ExpenseSheet
          group={group}
          me={me}
          expense={sheet === 'new' || sheet === 'settle' ? null : sheet}
          mode={sheet === 'settle' ? 'settle' : 'expense'}
          settlePreset={sheet === 'settle' ? settlePreset : null}
          onClose={() => {
            setSheet(null)
            setSettlePreset(null)
          }}
        />
      )}

      {showMembers && <MembersSheet group={group} me={me} onClose={() => setShowMembers(false)} />}
    </div>
  )
}
