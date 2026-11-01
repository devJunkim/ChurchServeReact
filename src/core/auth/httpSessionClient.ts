import {
  browserCookieSource,
  readAntiforgeryToken,
  type CookieSource,
} from './antiforgery'
import {
  isPermission,
  type CurrentUser,
  type SignInCommand,
} from './session'
import type { SessionClient } from './sessionClient'
import {
  normalizeNetworkError,
  responseProblem,
} from '../http/appProblem'
import { retryTransientRead } from '../http/retryTransientRead'

type Fetch = typeof fetch

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
    return retryTransientRead(async () => {
      const response = await this.fetcher(this.baseUrl, {
        credentials: 'same-origin',
        signal,
      })
      if (response.status === 401) return undefined
      await ensureSuccess(response)
      return parseCurrentUser(await readJson(response))
    }, undefined, signal)
  }

  readonly signIn = async (
    command: SignInCommand,
    signal?: AbortSignal,
  ) => {
    try {
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
    } catch (error) {
      throw normalizeNetworkError(error)
    }
  }

  readonly signOut = async (signal?: AbortSignal) => {
    try {
      const response = await this.fetcher(this.baseUrl, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: {
          'X-XSRF-TOKEN': readAntiforgeryToken(this.cookieSource),
        },
        signal,
      })
      await ensureSuccess(response)
    } catch (error) {
      throw normalizeNetworkError(error)
    }
  }
}

async function ensureSuccess(response: Response) {
  if (!response.ok) throw await responseProblem(response)
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
    !value.roles.every(isNonEmptyString) ||
    !Array.isArray(value.permissions) ||
    !value.permissions.every(isPermission)
  ) {
    throw new InvalidSessionResponseError()
  }

  return {
    id: value.id,
    email: value.email,
    displayName: value.displayName,
    roles: [...value.roles],
    permissions: [...value.permissions],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
