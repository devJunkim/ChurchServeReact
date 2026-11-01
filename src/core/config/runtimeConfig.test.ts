import { describe, expect, it, vi } from 'vitest'
import {
  appendApiPath,
  loadRuntimeConfig,
  parseRuntimeConfig,
} from './runtimeConfig'

describe('runtime configuration', () => {
  it('loads and validates public configuration without using browser cache', async () => {
    const fetchConfig = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          apiBaseUrl: '/church-api/',
          release: '2026.11.01.1',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await expect(loadRuntimeConfig(fetchConfig)).resolves.toEqual({
      apiBaseUrl: '/church-api',
      release: '2026.11.01.1',
    })
    expect(fetchConfig).toHaveBeenCalledWith('/runtime-config.json', {
      cache: 'no-store',
      credentials: 'same-origin',
    })
  })

  it.each([
    'https://api.example',
    '//api.example',
    '/api?tenant=one',
    '/api#fragment',
    '/api\\nested',
    '/api ',
  ])('rejects unsafe API base URL %s', (apiBaseUrl) => {
    expect(() => parseRuntimeConfig({ apiBaseUrl, release: 'test' })).toThrow(
      'apiBaseUrl must be a same-origin absolute path.',
    )
  })

  it('rejects an unsuccessful configuration response', async () => {
    const fetchConfig = vi.fn().mockResolvedValue(
      new Response(null, { status: 503 }),
    )

    await expect(loadRuntimeConfig(fetchConfig)).rejects.toThrow(
      'Runtime configuration returned HTTP 503.',
    )
  })

  it('requires a release identifier', () => {
    expect(() =>
      parseRuntimeConfig({ apiBaseUrl: '/api', release: ' ' }),
    ).toThrow('Runtime configuration requires a non-empty release identifier.')
  })

  it('joins API paths without creating a protocol-relative URL', () => {
    expect(appendApiPath('/church-api', '/session')).toBe(
      '/church-api/session',
    )
    expect(appendApiPath('/', '/session')).toBe('/session')
  })
})
