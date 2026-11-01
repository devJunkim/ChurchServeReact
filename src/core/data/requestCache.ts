export type CacheLookup<T> =
  | { readonly hit: true; readonly value: T }
  | { readonly hit: false }

export type RequestCacheOptions = {
  readonly maxAgeMs: number
  readonly maxEntries: number
  readonly now?: () => number
}

type CacheEntry<T> = { readonly value: T; readonly storedAt: number }
type ActiveRequest<T> = {
  readonly controller: AbortController
  readonly promise: Promise<T>
}

export class RequestCache<TKey, TValue> {
  private readonly options: RequestCacheOptions
  private readonly values = new Map<TKey, CacheEntry<TValue>>()
  private readonly requests = new Map<TKey, ActiveRequest<TValue>>()
  private readonly now: () => number
  private generation = 0

  constructor(options: RequestCacheOptions) {
    if (options.maxAgeMs < 0) {
      throw new Error('Request cache maxAgeMs cannot be negative.')
    }
    if (!Number.isInteger(options.maxEntries) || options.maxEntries < 1) {
      throw new Error('Request cache maxEntries must be a positive integer.')
    }
    this.options = options
    this.now = options.now ?? Date.now
  }

  read(key: TKey): CacheLookup<TValue> {
    const entry = this.values.get(key)
    if (!entry) return { hit: false }
    if (this.now() - entry.storedAt > this.options.maxAgeMs) {
      this.values.delete(key)
      return { hit: false }
    }
    this.values.delete(key)
    this.values.set(key, entry)
    return { hit: true, value: entry.value }
  }

  getOrLoad(
    key: TKey,
    load: (signal: AbortSignal) => Promise<TValue>,
    forceRefresh = false,
  ): Promise<TValue> {
    if (!forceRefresh) {
      const cached = this.read(key)
      if (cached.hit) return Promise.resolve(cached.value)
      const pending = this.requests.get(key)
      if (pending) return pending.promise
    } else {
      this.values.delete(key)
      this.cancelRequest(key)
    }

    const controller = new AbortController()
    const requestGeneration = this.generation
    let request!: ActiveRequest<TValue>
    const promise = Promise.resolve()
      .then(() => {
        controller.signal.throwIfAborted()
        return load(controller.signal)
      })
      .then((value) => {
        if (
          !controller.signal.aborted &&
          this.generation === requestGeneration &&
          this.requests.get(key) === request
        ) {
          this.set(key, value)
        }
        return value
      })
      .finally(() => {
        if (this.requests.get(key) === request) this.requests.delete(key)
      })
    request = { controller, promise }
    this.requests.set(key, request)
    return promise
  }

  set(key: TKey, value: TValue) {
    this.values.delete(key)
    this.values.set(key, { value, storedAt: this.now() })
    while (this.values.size > this.options.maxEntries) {
      const oldest = this.values.keys().next()
      if (oldest.done) break
      this.values.delete(oldest.value)
    }
  }

  invalidate(key: TKey) {
    this.values.delete(key)
  }

  clear() {
    this.generation++
    this.values.clear()
    for (const request of this.requests.values()) request.controller.abort()
    this.requests.clear()
  }

  private cancelRequest(key: TKey) {
    const request = this.requests.get(key)
    request?.controller.abort()
    this.requests.delete(key)
  }
}
