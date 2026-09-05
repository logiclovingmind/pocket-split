const fmtCache = new Map()

function formatter(currency) {
  const key = currency || 'INR'
  let f = fmtCache.get(key)
  if (!f) {
    f = new Intl.NumberFormat(key === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: key,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
    fmtCache.set(key, f)
  }
  return f
}

export function formatMoney(amount, currency = 'INR') {
  return formatter(currency).format(Number(amount) || 0)
}

// kept for any old callers
export const formatINR = (amount) => formatMoney(amount, 'INR')

export function formatDay(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function formatMonth(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export function toLocalInputValue(iso) {
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'JPY']

export function currencySymbol(currency = 'INR') {
  const parts = formatter(currency).formatToParts(0)
  return parts.find((p) => p.type === 'currency')?.value ?? currency
}
