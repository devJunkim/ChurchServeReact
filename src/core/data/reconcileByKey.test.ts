import { describe, expect, it } from 'vitest'
import { reconcileByKey } from './reconcileByKey'

type Item = { readonly id: string; readonly value: string }
const equalItem = (left: Item, right: Item) => left.value === right.value

describe('reconcileByKey', () => {
  it('returns the previous array when order and values are unchanged', () => {
    const previous: readonly Item[] = [
      { id: 'one', value: '1' },
      { id: 'two', value: '2' },
    ]
    const incoming = previous.map((item) => ({ ...item }))

    const result = reconcileByKey(previous, incoming, (item) => item.id, equalItem)

    expect(result).toBe(previous)
    expect(result[0]).toBe(previous[0])
    expect(result[1]).toBe(previous[1])
  })

  it('preserves unchanged items when another item changes', () => {
    const previous: readonly Item[] = [
      { id: 'one', value: '1' },
      { id: 'two', value: '2' },
    ]
    const incoming: readonly Item[] = [
      { id: 'one', value: '1' },
      { id: 'two', value: 'updated' },
    ]

    const result = reconcileByKey(previous, incoming, (item) => item.id, equalItem)

    expect(result).not.toBe(previous)
    expect(result[0]).toBe(previous[0])
    expect(result[1]).toBe(incoming[1])
  })

  it('uses incoming order while preserving matching entities', () => {
    const previous: readonly Item[] = [
      { id: 'one', value: '1' },
      { id: 'two', value: '2' },
    ]
    const incoming: readonly Item[] = [
      { id: 'two', value: '2' },
      { id: 'one', value: '1' },
    ]

    const result = reconcileByKey(previous, incoming, (item) => item.id, equalItem)

    expect(result).toEqual([previous[1], previous[0]])
    expect(result[0]).toBe(previous[1])
    expect(result[1]).toBe(previous[0])
  })

  it('retains a stable empty array and accepts a later empty result', () => {
    const empty: readonly Item[] = []
    expect(reconcileByKey(empty, [], (item) => item.id, equalItem)).toBe(empty)

    const previous: readonly Item[] = [{ id: 'one', value: '1' }]
    const incoming: readonly Item[] = []
    expect(reconcileByKey(previous, incoming, (item) => item.id, equalItem)).toBe(
      incoming,
    )
  })
})
