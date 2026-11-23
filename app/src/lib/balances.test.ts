import { describe, expect, it } from 'vitest'
import { netBalances, parseMoney, settleUp, splitShares } from './balances'
import { nextDueDate } from './dates'

describe('splitShares', () => {
  it('is penny-exact', () => {
    const s = splitShares(1000, ['a', 'b', 'c'])
    expect([...s.values()]).toEqual([334, 333, 333])
  })
})

describe('netBalances + settleUp', () => {
  it('computes who owes whom', () => {
    const net = netBalances([
      { amountCents: 9000, payerId: 'a', splitAmong: ['a', 'b', 'c'] }, // b,c owe a 30 each
      { amountCents: 3000, payerId: 'b', splitAmong: ['a', 'b'] }, // a owes b 15
    ])
    expect(net.get('a')).toBe(4500)
    expect(net.get('b')).toBe(-1500)
    expect(net.get('c')).toBe(-3000)
    expect(settleUp(net)).toEqual([
      { from: 'c', to: 'a', cents: 3000 },
      { from: 'b', to: 'a', cents: 1500 },
    ])
  })

  it('payer outside the split is owed everything', () => {
    const net = netBalances([{ amountCents: 2000, payerId: 'a', splitAmong: ['b', 'c'] }])
    expect(settleUp(net)).toEqual([
      { from: 'b', to: 'a', cents: 1000 },
      { from: 'c', to: 'a', cents: 1000 },
    ])
  })
})

describe('parseMoney', () => {
  it('parses common inputs', () => {
    expect(parseMoney('$12.50')).toBe(1250)
    expect(parseMoney('1,200')).toBe(120000)
    expect(parseMoney('0')).toBeNull()
    expect(parseMoney('abc')).toBeNull()
  })
})

describe('nextDueDate', () => {
  it('rolls daily and weekly chores forward to today or later', () => {
    expect(nextDueDate('2026-11-22', 'daily', '2026-11-23')).toBe('2026-11-23')
    expect(nextDueDate('2026-11-10', 'daily', '2026-11-23')).toBe('2026-11-23')
    expect(nextDueDate('2026-11-21', 'weekly', '2026-11-23')).toBe('2026-11-28')
  })
})
