import { normalizeNetworkError, toAppProblem } from './appProblem'

export type RetryTransientReadOptions = {
  readonly count?: number
  readonly initialDelayMs?: number
  readonly maximumDelayMs?: number
  readonly delay?: (milliseconds: number, signal?: AbortSignal) => Promise<void>
}

export async function retryTransientRead<T>(
  operation: () => Promise<T>,
  options: RetryTransientReadOptions = {},
  signal?: AbortSignal,
): Promise<T> {
  const count = options.count ?? 2
  const initialDelayMs = options.initialDelayMs ?? 250
  const maximumDelayMs = options.maximumDelayMs ?? 2_000
  const delay = options.delay ?? abortableDelay

  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted()
    try {
      return await operation()
    } catch (caught) {
      const error = normalizeNetworkError(caught)
      const problem = toAppProblem(error)
      if (problem.kind !== 'unavailable' || attempt >= count) throw error

      const retryAfterMs =
        problem.retryAfterSeconds === undefined
          ? undefined
          : problem.retryAfterSeconds * 1_000
      if (retryAfterMs !== undefined && retryAfterMs > maximumDelayMs) {
        throw error
      }
      const backoffMs = Math.min(
        maximumDelayMs,
        initialDelayMs * 2 ** attempt,
      )
      await delay(Math.max(retryAfterMs ?? 0, backoffMs), signal)
    }
  }
}

function abortableDelay(milliseconds: number, signal?: AbortSignal) {
  signal?.throwIfAborted()
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timeout)
      reject(signal?.reason)
    }
    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, milliseconds)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
