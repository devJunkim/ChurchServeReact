import {
  browserCookieSource,
  readAntiforgeryToken,
  type CookieSource,
} from './antiforgery'
import type { CurrentUser, SignInCommand } from './session'
import type { SessionClient } from './sessionClient'

type Fetch = typeof fetch

export class SessionHttpError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`The session request failed with status ${status}.`)
    this.name = 'SessionHttpError'
    this.status = status
  }
}

export class InvalidSessionResponseError extends Error {
  constructor() {
    super('The session response did not match the expected contract.')
    this.name = 'InvalidSessionResponseError'
  }
}

export class HttpSessionClient implements SessionClient {
  private readonly baseUrl: string
  private readonly fetcher: Fetch
  private readonly cookieSource: CookieSource

  constructor(
    baseUrl = '/api/session',
    fetcher: Fetch = globalThis.fetch,
    cookieSource: CookieSource = browserCookieSource,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.fetcher = fetcher
    this.cookieSource = cookieSource
  }

  readonly restore = async (signal?: AbortSignal) => {
    const response = await this.fetcher(this.baseUrl, {
      credentials: 'same-origin',
      signal,
    })

    if (response.status === 401) {
      return undefined
    }

    await ensureSuccess(response)
    return parseCurrentUser(await readJson(response))
  }

  readonly signIn = async (
    command: SignInCommand,
    signal?: AbortSignal,
  ) => {
    const response = await this.fetcher(`${this.baseUrl}/sign-in`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': readAntiforgeryToken(this.cookieSource),
      },
      body: JSON.stringify(command),
      signal,
    })

    await ensureSuccess(response)
    return parseCurrentUser(await readJson(response))
  }

  readonly signOut = async (signal?: AbortSignal) => {
    const response = await this.fetcher(this.baseUrl, {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: {
        'X-XSRF-TOKEN': readAntiforgeryToken(this.cookieSource),
      },
      signal,
    })

    await ensureSuccess(response)
  }
}

async function ensureSuccess(response: Response) {
  if (!response.ok) {
    throw new SessionHttpError(response.status)
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new InvalidSessionResponseError()
  }
}

function parseCurrentUser(value: unknown): CurrentUser {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.email) ||
    !isNonEmptyString(value.displayName) ||
    !Array.isArray(value.roles) ||
    !value.roles.every(isNonEmptyString)
  ) {
    throw new InvalidSessionResponseError()
  }

  return {
    id: value.id,
    email: value.email,
    displayName: value.displayName,
    roles: [...value.roles],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
