import { useState } from 'react'
import { saveExpense, deleteExpense } from '../lib/sync'
import { formatMoney, currencySymbol } from '../lib/format'

export default function SettleForm({ group, preset, expense, onClose }) {
  const members = group.members
  const cur = group.currency
  const editing = Boolean(expense)
  const [from, setFrom] = useState(
    expense?.paid_by?.[0]?.member ?? preset?.from ?? members[0]?.id
  )
  const [to, setTo] = useState(
    expense?.split?.[0]?.member ?? preset?.to ?? members[1]?.id
  )
  const [amount, setAmount] = useState(
    expense?.amount ? String(expense.amount) : preset?.amount ? String(preset.amount) : ''
  )

  const amt = Number(amount) || 0
  const valid = amt > 0 && from && to && from !== to

  const submit = async (e) => {
    e.preventDefault()
    if (!valid) return
    await saveExpense({
      id: expense?.id ?? crypto.randomUUID(),
      room: group.room,
      group_id: group.id,
      description: 'Settle up',
      amount: amt,
      currency: cur,
      category: 'general',
      type: 'settle',
      paid_by: [{ member: from, amount: amt }],
      split: [{ member: to, amount: amt }],
      split_mode: 'equal',
      split_meta: {},
      note: '',
      happened_at: expense?.happened_at ?? new Date().toISOString(),
      deleted: false,
    })
    onClose()
  }

  const remove = async () => {
    if (!confirm('Delete this payment?')) return
    await deleteExpense(expense.id)
    onClose()
  }

  const Picker = ({ value, onChange }) => (
    <div className="flex flex-wrap gap-1.5">
      {members.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(m.id)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            value === m.id ? 'bg-pink text-white' : 'bg-panel text-mist'
          }`}
        >
          {m.name}
        </button>
      ))}
    </div>
  )

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-4 rounded-t-3xl border-t border-line bg-panel p-6 sm:rounded-3xl sm:border"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">{editing ? 'Edit payment' : 'Record a payment'}</h2>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-fog">×</button>
        </div>

        <div className="flex flex-col gap-2">
          <p className="px-1 text-[10px] uppercase tracking-wider text-fog">Who paid</p>
          <Picker value={from} onChange={setFrom} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="px-1 text-[10px] uppercase tracking-wider text-fog">Paid to</p>
          <Picker value={to} onChange={setTo} />
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-panel-2 px-4">
          <span className="text-lg text-fog">{currencySymbol(cur)}</span>
          <input
            type="number" inputMode="decimal" min="0" step="any" placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            className="font-mono-num w-full bg-transparent py-3.5 text-2xl font-semibold outline-none placeholder:text-fog"
          />
        </div>

        {from === to && <p className="text-[11px] text-pink">Payer and receiver must differ.</p>}

        <button
          type="submit"
          disabled={!valid}
          className="rounded-xl bg-linear-to-r from-pink via-violet to-cyan py-3.5 font-semibold text-white transition-opacity disabled:opacity-30"
        >
          {editing ? 'Save' : 'Record'} {amt > 0 ? formatMoney(amt, cur) : 'payment'}
        </button>
        {editing && (
          <button type="button" onClick={remove} className="py-1 text-sm text-red-400">
            Delete payment
          </button>
        )}
      </form>
    </div>
  )
}
