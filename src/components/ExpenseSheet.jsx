import { useMemo, useState } from 'react'
import { saveExpense, deleteExpense } from '../lib/sync'
import { resolveSplit } from '../lib/split'
import { toLocalInputValue, formatMoney, currencySymbol } from '../lib/format'
import { CATEGORIES } from '../lib/group'
import SettleForm from './SettleForm'

const MODES = [
  ['equal', '='],
  ['exact', '₹'],
  ['percent', '%'],
  ['shares', 'x'],
]

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

export default function ExpenseSheet({ group, me, expense, mode, settlePreset, onClose }) {
  if (mode === 'settle' || expense?.type === 'settle') {
    return (
      <SettleForm
        group={group}
        preset={settlePreset}
        expense={expense?.type === 'settle' ? expense : null}
        onClose={onClose}
      />
    )
  }

  const editing = Boolean(expense)
  const members = group.members
  const cur = group.currency

  const [description, setDescription] = useState(expense?.description ?? '')
  const [amount, setAmount] = useState(expense?.amount ?? '')
  const [category, setCategory] = useState(expense?.category ?? 'general')
  const [happenedAt, setHappenedAt] = useState(
    toLocalInputValue(expense?.happened_at ?? new Date().toISOString())
  )

  // payers
  const [multiPayer, setMultiPayer] = useState((expense?.paid_by?.length ?? 1) > 1)
  const [singlePayer, setSinglePayer] = useState(
    expense?.paid_by?.length === 1 ? expense.paid_by[0].member : me
  )
  const [payerAmounts, setPayerAmounts] = useState(() =>
    Object.fromEntries(
      members.map((m) => [m.id, expense?.paid_by?.find((p) => p.member === m.id)?.amount ?? ''])
    )
  )

  // split
  const initialParticipants =
    expense?.split?.map((s) => s.member) ?? members.map((m) => m.id)
  const [participants, setParticipants] = useState(new Set(initialParticipants))
  const [splitMode, setSplitMode] = useState(expense?.split_mode ?? 'equal')
  const [splitMeta, setSplitMeta] = useState(() => expense?.split_meta ?? {})

  const amt = Number(amount) || 0
  const partIds = members.filter((m) => participants.has(m.id)).map((m) => m.id)

  // compute owed preview + validation in one place (auto-fills blank rows)
  const { split: preview, error: splitError } = useMemo(() => {
    if (amt <= 0 || partIds.length === 0)
      return { split: partIds.map((id) => ({ member: id, amount: 0 })), error: '' }
    return resolveSplit(splitMode, amt, partIds, splitMeta)
  }, [splitMode, amt, partIds.join(','), JSON.stringify(splitMeta)])

  const previewMap = Object.fromEntries(preview.map((s) => [s.member, s.amount]))

  // payers list + validation
  const payers = multiPayer
    ? members
        .map((m) => ({ member: m.id, amount: round2(payerAmounts[m.id]) }))
        .filter((p) => p.amount > 0)
    : [{ member: singlePayer, amount: amt }]
  const payerSum = round2(payers.reduce((a, p) => a + p.amount, 0))

  const payerError =
    multiPayer && Math.abs(payerSum - amt) > 0.01
      ? `Payers add to ${formatMoney(payerSum, cur)}, need ${formatMoney(amt, cur)}`
      : ''

  const valid = amt > 0 && !splitError && !payerError && payers.length > 0

  const togglePart = (id) =>
    setParticipants((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const setMeta = (id, v) => setSplitMeta((m) => ({ ...m, [id]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!valid) return
    await saveExpense({
      id: expense?.id ?? crypto.randomUUID(),
      room: group.room,
      group_id: group.id,
      description: description.trim() || 'Expense',
      amount: amt,
      currency: cur,
      category,
      type: 'expense',
      paid_by: payers,
      split: preview,
      split_mode: splitMode,
      split_meta: splitMode === 'equal' ? {} : splitMeta,
      note: '',
      happened_at: new Date(happenedAt).toISOString(),
      deleted: false,
    })
    onClose()
  }

  const remove = async () => {
    if (!confirm('Delete this expense?')) return
    await deleteExpense(expense.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-3xl border-t border-line bg-panel p-6 sm:rounded-3xl sm:border"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">{editing ? 'Edit expense' : 'Add expense'}</h2>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-fog">×</button>
        </div>

        <input
          autoFocus={!editing}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was it for?"
          className="rounded-xl bg-panel-2 px-4 py-3 text-sm outline-none placeholder:text-fog"
        />

        <div className="flex items-center gap-2 rounded-xl bg-panel-2 px-4">
          <span className="text-lg text-fog">{currencySymbol(cur)}</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="font-mono-num w-full bg-transparent py-3.5 text-2xl font-semibold outline-none placeholder:text-fog"
          />
        </div>

        {/* Paid by */}
        <div className="flex flex-col gap-2 rounded-xl bg-panel-2 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-fog">Paid by</p>
            <button
              type="button"
              onClick={() => setMultiPayer((v) => !v)}
              className="text-[11px] font-semibold text-violet"
            >
              {multiPayer ? 'Single payer' : 'Multiple payers'}
            </button>
          </div>
          {multiPayer ? (
            <div className="flex flex-col gap-1.5">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <span className="flex-1 truncate text-sm">{m.name}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={payerAmounts[m.id]}
                    onChange={(e) => setPayerAmounts((p) => ({ ...p, [m.id]: e.target.value }))}
                    className="font-mono-num w-24 rounded-lg bg-panel px-3 py-2 text-right text-sm outline-none placeholder:text-fog"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSinglePayer(m.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    singlePayer === m.id ? 'bg-pink text-white' : 'bg-panel text-mist'
                  }`}
                >
                  {m.id === me ? 'You' : m.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Split */}
        <div className="flex flex-col gap-2 rounded-xl bg-panel-2 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-fog">Split</p>
            <div className="flex gap-1 rounded-full bg-panel p-0.5">
              {MODES.map(([m, glyph]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSplitMode(m)}
                  className={`h-7 w-8 rounded-full text-xs font-bold transition-colors ${
                    splitMode === m ? 'bg-violet text-white' : 'text-fog'
                  }`}
                >
                  {glyph}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {members.map((m) => {
              const on = participants.has(m.id)
              return (
                <div key={m.id} className="flex items-center gap-2 py-0.5">
                  <button
                    type="button"
                    onClick={() => togglePart(m.id)}
                    className={`flex h-6 w-6 items-center justify-center rounded-md border text-xs ${
                      on ? 'border-cyan bg-cyan/20 text-cyan' : 'border-line text-fog'
                    }`}
                  >
                    {on ? '✓' : ''}
                  </button>
                  <span className={`flex-1 truncate text-sm ${on ? '' : 'text-fog'}`}>
                    {m.id === me ? 'You' : m.name}
                  </span>

                  {on && splitMode === 'exact' && (
                    <input
                      type="number" inputMode="decimal" min="0" step="any" placeholder="0"
                      value={splitMeta[m.id] ?? ''}
                      onChange={(e) => setMeta(m.id, e.target.value)}
                      className="font-mono-num w-20 rounded-lg bg-panel px-2 py-1.5 text-right text-sm outline-none placeholder:text-fog"
                    />
                  )}
                  {on && splitMode === 'percent' && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number" inputMode="decimal" min="0" step="any" placeholder="0"
                        value={splitMeta[m.id] ?? ''}
                        onChange={(e) => setMeta(m.id, e.target.value)}
                        className="font-mono-num w-16 rounded-lg bg-panel px-2 py-1.5 text-right text-sm outline-none placeholder:text-fog"
                      />
                      <span className="text-xs text-fog">%</span>
                    </div>
                  )}
                  {on && splitMode === 'shares' && (
                    <input
                      type="number" inputMode="numeric" min="0" step="1" placeholder="1"
                      value={splitMeta[m.id] ?? ''}
                      onChange={(e) => setMeta(m.id, e.target.value)}
                      className="font-mono-num w-16 rounded-lg bg-panel px-2 py-1.5 text-right text-sm outline-none placeholder:text-fog"
                    />
                  )}

                  {on && (
                    <span className="font-mono-num w-20 shrink-0 text-right text-xs text-mist">
                      {formatMoney(previewMap[m.id] ?? 0, cur)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          {(splitError || payerError) && (
            <p className="text-[11px] text-pink">{splitError || payerError}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl bg-panel-2 px-3 py-3 text-sm text-mist outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={happenedAt}
            onChange={(e) => setHappenedAt(e.target.value)}
            className="rounded-xl bg-panel-2 px-3 py-3 text-sm text-mist outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={!valid}
          className="rounded-xl bg-linear-to-r from-pink via-violet to-cyan py-3.5 font-semibold text-white transition-opacity disabled:opacity-30"
        >
          {editing ? 'Save changes' : 'Add expense'}
        </button>
        {editing && (
          <button type="button" onClick={remove} className="py-1 text-sm text-red-400">
            Delete expense
          </button>
        )}
      </form>
    </div>
  )
}
