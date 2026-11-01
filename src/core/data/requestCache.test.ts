import { describe, expect, it, vi } from 'vitest'
import { RequestCache } from './requestCache'

describe('RequestCache', () => {
  it('shares one in-flight request and retains its result', async () => {
    const response = deferred<string>()
    const load = vi.fn(() => response.promise)
    const cache = createCache()
    const first = cache.getOrLoad('events', load)
    const second = cache.getOrLoad('events', load)
    expect(load).toHaveBeenCalledTimes(0)
    response.resolve('page-1')
    await expect(Promise.all([first, second])).resolves.toEqual(['page-1', 'page-1'])
    await expect(cache.getOrLoad('events', load)).resolves.toBe('page-1')
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('refreshes a value after its exact freshness boundary', async () => {
    let now = 0
    let loads = 0
    const cache = createCache(() => now)
    const load = async () => `value-${++loads}`
    await cache.getOrLoad('events', load)
    now = 100
    await expect(cache.getOrLoad('events', load)).resolves.toBe('value-1')
    now = 101
    await expect(cache.getOrLoad('events', load)).resolves.toBe('value-2')
  })

  it('does not retain a failed request', async () => {
    let loads = 0
    const cache = createCache()
    const load = async () => {
      if (++loads === 1) throw new Error('offline')
      return 'recovered'
    }
    await expect(cache.getOrLoad('events', load)).rejects.toThrow('offline')
    await expect(cache.getOrLoad('events', load)).resolves.toBe('recovered')
  })

  it('evicts the least recently used completed value', () => {
    const cache = createCache()
    cache.set('one', '1')
    cache.set('two', '2')
    cache.read('one')
    cache.set('three', '3')
    expect(cache.read('one')).toEqual({ hit: true, value: '1' })
    expect(cache.read('two')).toEqual({ hit: false })
    expect(cache.read('three')).toEqual({ hit: true, value: '3' })
  })

  it('distinguishes a cached undefined value from a miss', () => {
    const cache = new RequestCache<string, string | undefined>({
      maxAgeMs: 100,
      maxEntries: 2,
    })
    cache.set('missing-detail', undefined)
    expect(cache.read('missing-detail')).toEqual({ hit: true, value: undefined })
  })

  it('force refresh aborts and replaces the active request', async () => {
    const signals: AbortSignal[] = []
    const responses = [deferred<string>(), deferred<string>()]
    let call = 0
    const cache = createCache()
    const load = (signal: AbortSignal) => {
      signals.push(signal)
      return responses[call++].promise
    }
    const obsolete = cache.getOrLoad('events', load)
    await Promise.resolve()
    const current = cache.getOrLoad('events', load, true)
    await Promise.resolve()
    expect(signals[0].aborted).toBe(true)
    responses[1].resolve('current')
    await expect(current).resolves.toBe('current')
    responses[0].resolve('obsolete')
    await expect(obsolete).resolves.toBe('obsolete')
    expect(cache.read('events')).toEqual({ hit: true, value: 'current' })
  })

  it('clear aborts active work and blocks late cache population', async () => {
    const response = deferred<string>()
    let signal: AbortSignal | undefined
    const cache = createCache()
    const pending = cache.getOrLoad('events', (value) => {
      signal = value
      return response.promise
    })
    await Promise.resolve()
    cache.clear()
    expect(signal?.aborted).toBe(true)
    response.resolve('old identity')
    await expect(pending).resolves.toBe('old identity')
    expect(cache.read('events')).toEqual({ hit: false })
  })

  it('validates cache limits', () => {
    expect(() => new RequestCache({ maxAgeMs: -1, maxEntries: 1 })).toThrow('maxAgeMs')
    expect(() => new RequestCache({ maxAgeMs: 1, maxEntries: 0 })).toThrow('maxEntries')
  })
})

function createCache(now?: () => number) {
  return new RequestCache<string, string>({ maxAgeMs: 100, maxEntries: 2, now })
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}
