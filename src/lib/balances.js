// Net balance per member across a group's expenses.
// Positive net = the member is owed money (paid more than their share).
// Negative net = the member owes money.
// A 'settle' expense is a payment: paid_by is the payer, split is the receiver.

export function memberBalances(expenses, memberIds) {
  const net = Object.fromEntries(memberIds.map((id) => [id, 0]))
  for (const e of expenses) {
    if (e.deleted) continue
    for (const p of e.paid_by ?? []) {
      if (p.member in net) net[p.member] += Number(p.amount) || 0
    }
    for (const s of e.split ?? []) {
      if (s.member in net) net[s.member] -= Number(s.amount) || 0
    }
  }
  // round to paise
  for (const id of memberIds) net[id] = Math.round(net[id] * 100) / 100
  return net
}

// Greedy debt simplification: match biggest debtor to biggest creditor until
// everyone nets to zero. Minimises the number of transactions.
export function simplifyDebts(net) {
  const creditors = []
  const debtors = []
  for (const [member, amount] of Object.entries(net)) {
    const cents = Math.round(amount * 100)
    if (cents > 0) creditors.push({ member, cents })
    else if (cents < 0) debtors.push({ member, cents: -cents })
  }
  creditors.sort((a, b) => b.cents - a.cents)
  debtors.sort((a, b) => b.cents - a.cents)

  const transfers = []
  let ci = 0
  let di = 0
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci]
    const d = debtors[di]
    const pay = Math.min(c.cents, d.cents)
    if (pay > 0) transfers.push({ from: d.member, to: c.member, amount: pay / 100 })
    c.cents -= pay
    d.cents -= pay
    if (c.cents === 0) ci++
    if (d.cents === 0) di++
  }
  return transfers
}

// One member's net, for the dashboard header.
export function balanceSummary(net, me) {
  const mine = net[me] ?? 0
  return { mine, positive: mine > 0.005, negative: mine < -0.005 }
}

export const groupTotal = (expenses) =>
  expenses
    .filter((e) => !e.deleted && e.type !== 'settle')
    .reduce((a, e) => a + (Number(e.amount) || 0), 0)
