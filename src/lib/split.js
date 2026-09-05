// All split math runs in integer paise (1 rupee = 100 paise) to avoid float
// drift, then converts back to rupees. Every mode returns [{ member, amount }]
// whose amounts sum exactly to the total.

const toPaise = (n) => Math.round((Number(n) || 0) * 100)
const toRupees = (p) => p / 100

// Distribute `totalPaise` across members by integer weights. Remainder paise
// (from rounding) are handed out one-by-one to the largest weights first, so
// the sum is always exact and the split is as fair as integer rounding allows.
function distribute(totalPaise, members, weights) {
  const weightSum = weights.reduce((a, b) => a + b, 0)
  if (weightSum <= 0 || members.length === 0) {
    return members.map((member) => ({ member, amount: 0 }))
  }
  const raw = weights.map((w) => (totalPaise * w) / weightSum)
  const floors = raw.map((r) => Math.floor(r))
  let remainder = totalPaise - floors.reduce((a, b) => a + b, 0)

  // order indices by largest fractional part, tie-break by larger weight
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r), w: weights[i] }))
    .sort((a, b) => b.frac - a.frac || b.w - a.w)
    .map((o) => o.i)

  const result = floors.slice()
  for (let k = 0; k < remainder; k++) result[order[k % order.length]] += 1
  return members.map((member, i) => ({ member, amount: toRupees(result[i]) }))
}

export function splitEqual(amount, memberIds) {
  return distribute(toPaise(amount), memberIds, memberIds.map(() => 1))
}

export function splitShares(amount, entries) {
  // entries: [{ member, shares }]
  return distribute(
    toPaise(amount),
    entries.map((e) => e.member),
    entries.map((e) => Math.max(0, Number(e.shares) || 0))
  )
}

export function splitPercent(amount, entries) {
  // entries: [{ member, percent }] — percents should sum to 100
  return distribute(
    toPaise(amount),
    entries.map((e) => e.member),
    entries.map((e) => Math.max(0, Number(e.percent) || 0))
  )
}

export function splitExact(entries) {
  // entries: [{ member, amount }] — trusted as-is (validated in the UI)
  return entries.map((e) => ({ member: e.member, amount: Number(e.amount) || 0 }))
}

// Compute the final [{ member, amount }] owed list from a mode + raw inputs.
export function computeSplit(mode, amount, participants, meta = {}) {
  const ids = participants
  switch (mode) {
    case 'shares':
      return splitShares(amount, ids.map((m) => ({ member: m, shares: meta[m] ?? 1 })))
    case 'percent':
      return splitPercent(amount, ids.map((m) => ({ member: m, percent: meta[m] ?? 0 })))
    case 'exact':
      return splitExact(ids.map((m) => ({ member: m, amount: meta[m] ?? 0 })))
    case 'equal':
    default:
      return splitEqual(amount, ids)
  }
}

export const sumAmounts = (list) =>
  Math.round(list.reduce((a, b) => a + (Number(b.amount) || 0), 0) * 100) / 100

const isBlank = (v) => v === undefined || v === null || v === ''
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

// Resolve a split, auto-filling blank rows Splitwise-style, and report any error.
// Returns { split: [{ member, amount }], error }.
//  - exact:   typed amounts are fixed; blank rows share the leftover equally.
//  - percent: typed %s are fixed; blank rows share the remaining % equally.
//  - shares:  blank rows default to 1 share.
export function resolveSplit(mode, amount, participants, meta = {}) {
  const ids = participants
  if (ids.length === 0) return { split: [], error: 'Pick at least one person' }
  const amtPaise = toPaise(amount)

  if (mode === 'equal') return { split: splitEqual(amount, ids), error: '' }

  if (mode === 'shares') {
    const entries = ids.map((m) => ({
      member: m,
      shares: isBlank(meta[m]) ? 1 : Math.max(0, Number(meta[m]) || 0),
    }))
    if (entries.reduce((a, e) => a + e.shares, 0) <= 0)
      return { split: ids.map((m) => ({ member: m, amount: 0 })), error: 'Give someone a share' }
    return { split: splitShares(amount, entries), error: '' }
  }

  if (mode === 'percent') {
    const typed = ids.filter((m) => !isBlank(meta[m]))
    const blanks = ids.filter((m) => isBlank(meta[m]))
    const typedSum = typed.reduce((a, m) => a + (Number(meta[m]) || 0), 0)
    const percents = {}
    for (const m of typed) percents[m] = Math.max(0, Number(meta[m]) || 0)
    let error = ''
    if (blanks.length) {
      const rem = 100 - typedSum
      if (rem < -0.1) error = 'Percentages add up to more than 100%'
      const each = Math.max(0, rem) / blanks.length
      for (const m of blanks) percents[m] = each
    } else if (Math.abs(typedSum - 100) > 0.1) {
      error = `Percentages add to ${round2(typedSum)}%, need 100%`
    }
    const split = distribute(amtPaise, ids, ids.map((m) => percents[m] || 0))
    return { split, error }
  }

  // exact
  const typed = ids.filter((m) => !isBlank(meta[m]))
  const blanks = ids.filter((m) => isBlank(meta[m]))
  const typedSumPaise = typed.reduce((a, m) => a + toPaise(meta[m]), 0)
  const result = {}
  for (const m of typed) result[m] = toPaise(meta[m])
  const remaining = amtPaise - typedSumPaise
  let error = ''
  if (blanks.length) {
    if (remaining < 0) error = 'Entered amounts exceed the total'
    for (const d of distribute(Math.max(0, remaining), blanks, blanks.map(() => 1)))
      result[d.member] = toPaise(d.amount)
  } else if (Math.abs(remaining) > 1) {
    error = 'Amounts must add up to the total'
  }
  return { split: ids.map((m) => ({ member: m, amount: toRupees(result[m] ?? 0) })), error }
}
