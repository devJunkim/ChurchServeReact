export function reconcileByKey<T, TKey>(
  previous: readonly T[],
  incoming: readonly T[],
  keyOf: (item: T) => TKey,
  equal: (left: T, right: T) => boolean,
): readonly T[] {
  if (incoming.length === 0) {
    return previous.length === 0 ? previous : incoming
  }

  const previousByKey = new Map(previous.map((item) => [keyOf(item), item]))
  let matchesPreviousArray = previous.length === incoming.length
  const reconciled = incoming.map((item, index) => {
    const existing = previousByKey.get(keyOf(item))
    const value = existing !== undefined && equal(existing, item) ? existing : item
    if (value !== previous[index]) matchesPreviousArray = false
    return value
  })

  return matchesPreviousArray ? previous : reconciled
}
