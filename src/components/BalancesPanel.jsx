import { simplifyDebts } from '../lib/balances'
import { formatMoney } from '../lib/format'
import { memberById } from '../lib/group'

export default function BalancesPanel({ group, me, net, onSettle }) {
  const cur = group.currency
  const debts = simplifyDebts(net)

  const Avatar = ({ id }) => {
    const m = memberById(group, id)
    return (
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
        style={{ background: m?.color ?? '#676c8e' }}
      >
        {m?.name?.[0]?.toUpperCase()}
      </span>
    )
  }
  const label = (id) => (id === me ? 'You' : memberById(group, id)?.name ?? '—')

  return (
    <main className="flex flex-col gap-5 pt-4">
      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-fog">Who owes whom</h2>
        {debts.length === 0 ? (
          <p className="rounded-xl bg-panel px-4 py-8 text-center text-sm text-fog">
            All settled up. 🎉
          </p>
        ) : (
          debts.map((d, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-panel px-4 py-3">
              <Avatar id={d.from} />
              <div className="min-w-0 flex-1 text-sm">
                <span className="font-semibold">{label(d.from)}</span>
                <span className="text-fog"> owes </span>
                <span className="font-semibold">{label(d.to)}</span>
              </div>
              <span className="font-mono-num text-sm font-semibold text-pink">
                {formatMoney(d.amount, cur)}
              </span>
              <button
                onClick={() => onSettle({ from: d.from, to: d.to, amount: d.amount })}
                className="rounded-full bg-violet/20 px-3 py-1 text-xs font-semibold text-violet active:bg-violet/30"
              >
                Settle
              </button>
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-fog">Balances</h2>
        {group.members.map((m) => {
          const bal = net[m.id] ?? 0
          const owed = bal > 0.005
          const owes = bal < -0.005
          return (
            <div key={m.id} className="flex items-center gap-3 rounded-xl bg-panel px-4 py-3">
              <Avatar id={m.id} />
              <span className="flex-1 truncate text-sm font-semibold">{label(m.id)}</span>
              <span
                className={`font-mono-num text-sm font-semibold ${
                  owed ? 'text-emerald-400' : owes ? 'text-pink' : 'text-fog'
                }`}
              >
                {owed ? 'gets back ' : owes ? 'owes ' : ''}
                {formatMoney(Math.abs(bal), cur)}
              </span>
            </div>
          )
        })}
      </section>

      <button
        onClick={() => onSettle(null)}
        className="mx-auto rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-mist active:bg-panel"
      >
        Record a payment
      </button>
    </main>
  )
}
