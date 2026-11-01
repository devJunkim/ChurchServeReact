export type RuntimeConfig = {
  readonly apiBaseUrl: string
  readonly release: string
}

type Fetch = typeof fetch

export async function loadRuntimeConfig(
  fetchConfig: Fetch = globalThis.fetch.bind(globalThis),
): Promise<RuntimeConfig> {
  const response = await fetchConfig('/runtime-config.json', {
    cache: 'no-store',
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new Error(`Runtime configuration returned HTTP ${response.status}.`)
  }

  return parseRuntimeConfig(await response.json())
}

export function parseRuntimeConfig(value: unknown): RuntimeConfig {
  if (!isRecord(value)) {
    throw new Error('Runtime configuration must be a JSON object.')
  }

  const apiBaseUrl = normalizeApiBaseUrl(value.apiBaseUrl)
  const release = value.release
  if (
    typeof release !== 'string' ||
    release.trim().length === 0 ||
    release.length > 100
  ) {
    throw new Error('Runtime configuration requires a non-empty release identifier.')
  }

  return { apiBaseUrl, release: release.trim() }
}

export function appendApiPath(apiBaseUrl: string, path: `/${string}`) {
  return `${apiBaseUrl === '/' ? '' : apiBaseUrl}${path}`
}

function normalizeApiBaseUrl(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value !== value.trim() ||
    value.includes('\\') ||
    value.includes('?') ||
    value.includes('#')
  ) {
    throw new Error('apiBaseUrl must be a same-origin absolute path.')
  }

  return value.length > 1 ? value.replace(/\/+$/, '') : value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
