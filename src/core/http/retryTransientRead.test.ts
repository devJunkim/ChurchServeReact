import { describe, expect, it, vi } from 'vitest'
import { AppProblemError } from './appProblem'
import { retryTransientRead } from './retryTransientRead'

describe('retryTransientRead', () => {
  it('retries unavailable reads with bounded exponential backoff', async () => {
    const unavailable = () => new AppProblemError({ kind: 'unavailable' })
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(unavailable())
      .mockRejectedValueOnce(unavailable())
      .mockResolvedValue('loaded')
    const delay = vi.fn().mockResolvedValue(undefined)

    await expect(
      retryTransientRead(operation, {
        count: 2,
        initialDelayMs: 10,
        maximumDelayMs: 20,
        delay,
      }),
    ).resolves.toBe('loaded')
    expect(operation).toHaveBeenCalledTimes(3)
    expect(delay).toHaveBeenNthCalledWith(1, 10, undefined)
    expect(delay).toHaveBeenNthCalledWith(2, 20, undefined)
  })

  it('does not retry authentication or validation failures', async () => {
    const operation = vi.fn().mockRejectedValue(
      new AppProblemError({ kind: 'unauthenticated' }),
    )

    await expect(
      retryTransientRead(operation, { delay: vi.fn() }),
    ).rejects.toMatchObject({ problem: { kind: 'unauthenticated' } })
    expect(operation).toHaveBeenCalledOnce()
  })

  it('does not violate a retry-after value outside the delay budget', async () => {
    const operation = vi.fn().mockRejectedValue(
      new AppProblemError({ kind: 'unavailable', retryAfterSeconds: 10 }),
    )
    const delay = vi.fn().mockResolvedValue(undefined)

    await expect(
      retryTransientRead(operation, { maximumDelayMs: 2_000, delay }),
    ).rejects.toMatchObject({ problem: { kind: 'unavailable' } })
    expect(operation).toHaveBeenCalledOnce()
    expect(delay).not.toHaveBeenCalled()
  })
})
