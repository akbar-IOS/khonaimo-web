/**
 * Shared-expense math, in integer cents.
 *
 * Each expense credits the payer with the full amount and debits each person
 * in `splitAmong` with an equal share. Leftover cents (e.g. $10 / 3) go one
 * each to the first people in the split, so shares always sum exactly to the
 * amount. `settleUp` then turns net balances into a short list of
 * "A pays B $x" transfers (greedy: largest debtor pays largest creditor).
 */

export type ExpenseLike = { amountCents: number; payerId: string; splitAmong: string[] }
export type Transfer = { from: string; to: string; cents: number }

export function splitShares(amountCents: number, people: string[]): Map<string, number> {
  const shares = new Map<string, number>()
  if (people.length === 0) return shares
  const base = Math.floor(amountCents / people.length)
  let remainder = amountCents - base * people.length
  for (const p of people) {
    shares.set(p, base + (remainder > 0 ? 1 : 0))
    if (remainder > 0) remainder--
  }
  return shares
}

/** Net balance per user: positive = is owed money, negative = owes money. */
export function netBalances(expenses: ExpenseLike[]): Map<string, number> {
  const net = new Map<string, number>()
  const add = (id: string, cents: number) => net.set(id, (net.get(id) ?? 0) + cents)
  for (const e of expenses) {
    const people = [...new Set(e.splitAmong ?? [])]
    if (!e.amountCents || people.length === 0) continue
    add(e.payerId, e.amountCents)
    for (const [p, share] of splitShares(e.amountCents, people)) add(p, -share)
  }
  return net
}

export function settleUp(net: Map<string, number>): Transfer[] {
  const debtors = [...net].filter(([, c]) => c < 0).map(([id, c]) => ({ id, c: -c }))
  const creditors = [...net].filter(([, c]) => c > 0).map(([id, c]) => ({ id, c }))
  debtors.sort((a, b) => b.c - a.c || a.id.localeCompare(b.id))
  creditors.sort((a, b) => b.c - a.c || a.id.localeCompare(b.id))
  const out: Transfer[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const cents = Math.min(debtors[i].c, creditors[j].c)
    if (cents > 0) out.push({ from: debtors[i].id, to: creditors[j].id, cents })
    debtors[i].c -= cents
    creditors[j].c -= cents
    if (debtors[i].c === 0) i++
    if (creditors[j].c === 0) j++
  }
  return out
}

export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

/** Parse "12.5", "$12.50", "1,200" → cents; null if invalid or not positive. */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, '')
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null
  const cents = Math.round(parseFloat(cleaned) * 100)
  return cents > 0 ? cents : null
}
