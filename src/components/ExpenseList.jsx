import { useState } from 'react'
import { formatMoney, formatDay, formatMonth } from '../lib/format'
import { categoryIcon, memberName } from '../lib/group'

function myLine(expense, me, cur) {
  if (expense.type === 'settle') {
    const from = expense.paid_by?.[0]?.member
    const to = expense.split?.[0]?.member
    return { text: `${from === me ? 'You' : ''} payment`, tone: 'settle' }
  }
  const paid = (expense.paid_by ?? []).find((p) => p.member === me)?.amount ?? 0
  const owed = (expense.split ?? []).find((s) => s.member === me)?.amount ?? 0
  const net = Math.round((paid - owed) * 100) / 100
  if (Math.abs(net) < 0.005) return { text: 'not involved', tone: 'muted' }
  if (net > 0) return { text: `you lent ${formatMoney(net, cur)}`, tone: 'pos' }
  return { text: `you owe ${formatMoney(-net, cur)}`, tone: 'neg' }
}

function Row({ expense, group, me, onEdit }) {
  const cur = group.currency
  const isSettle = expense.type === 'settle'
  const line = myLine(expense, me, cur)
  const payerNames =
    (expense.paid_by ?? [])
      .map((p) => (p.member === me ? 'You' : memberName(group, p.member)))
      .join(', ') || '—'

  const title = isSettle
    ? `${memberName(group, expense.paid_by?.[0]?.member)} → ${memberName(group, expense.split?.[0]?.member)}`
    : expense.description

  return (
    <button
      onClick={() => onEdit(expense)}
      className="flex w-full items-center gap-3 rounded-xl bg-panel px-3 py-3 text-left transition-colors active:bg-panel-2"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-panel-2 text-base">
        {isSettle ? '💸' : categoryIcon(expense.category)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title || 'Expense'}</p>
        <p className="mt-0.5 truncate text-xs text-fog">
          {isSettle ? 'Payment' : `${payerNames} paid ${formatMoney(expense.amount, cur)}`}
        </p>
      </div>
      <div className="text-right">
        <p
          className={`font-mono-num text-xs font-semibold ${
            line.tone === 'pos' ? 'text-emerald-400' : line.tone === 'neg' ? 'text-pink' : 'text-fog'
          }`}
        >
          {line.text}
        </p>
        <p className="mt-0.5 text-[10px] text-fog">{formatDay(expense.happened_at)}</p>
      </div>
    </button>
  )
}

export default function ExpenseList({ group, me, expenses, onEdit }) {
  const [cat, setCat] = useState('all')

  const cats = ['all', ...new Set(expenses.filter((e) => e.type !== 'settle').map((e) => e.category))]
  const filtered = expenses
    .filter((e) => cat === 'all' || e.category === cat || e.type === 'settle')
    .sort((a, b) => b.happened_at.localeCompare(a.happened_at))

  const groups = []
  for (const e of filtered) {
    const key = formatMonth(e.happened_at)
    const last = groups[groups.length - 1]
    if (last?.key === key) last.items.push(e)
    else groups.push({ key, items: [e] })
  }

  return (
    <main className="flex flex-col gap-4 pt-4">
      {cats.length > 2 && (
        <div className="flex flex-wrap gap-1.5">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                cat === c ? 'bg-pink text-white' : 'bg-panel text-mist'
              }`}
            >
              {c === 'all' ? 'All' : `${categoryIcon(c)} ${c}`}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="rounded-xl bg-panel px-4 py-10 text-center text-sm text-fog">
          No expenses yet. Tap + to add one.
        </p>
      ) : (
        groups.map(({ key, items }) => (
          <section key={key} className="flex flex-col gap-2">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-fog">{key}</h2>
            {items.map((e) => (
              <Row key={e.id} expense={e} group={group} me={me} onEdit={onEdit} />
            ))}
          </section>
        ))
      )}
    </main>
  )
}
