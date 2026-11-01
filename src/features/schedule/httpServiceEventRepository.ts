import type { CreateServiceEventCommand } from './createServiceEvent'
import type { ServiceEvent } from './serviceEvent'
import type { ServiceEventRepository } from './serviceEventRepository'
import {
  browserCookieSource,
  readAntiforgeryToken,
  type CookieSource,
} from '../../core/auth/antiforgery'
import {
  InvalidServiceEventResponseError,
  parseServiceEvent,
  parseServiceEvents,
} from './serviceEventValidation'
import {
  normalizeNetworkError,
  responseProblem,
} from '../../core/http/appProblem'
import { retryTransientRead } from '../../core/http/retryTransientRead'

type Fetch = typeof fetch

export class HttpServiceEventRepository implements ServiceEventRepository {
  private readonly baseUrl: string
  private readonly fetcher: Fetch
  private readonly cookieSource: CookieSource

  constructor(
    baseUrl = '/api/service-events',
    fetcher: Fetch = globalThis.fetch.bind(globalThis),
    cookieSource: CookieSource = browserCookieSource,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.fetcher = fetcher
    this.cookieSource = cookieSource
  }

  readonly list = async (signal?: AbortSignal) => {
    return retryTransientRead(async () => {
      const response = await this.fetcher(this.baseUrl, {
        credentials: 'same-origin',
        signal,
      })
      await ensureSuccess(response)
      return parseServiceEvents(await readJson(response))
    }, undefined, signal)
  }

  readonly findById = async (eventId: string, signal?: AbortSignal) => {
    return retryTransientRead(async () => {
      const response = await this.fetcher(
        `${this.baseUrl}/${encodeURIComponent(eventId)}`,
        { credentials: 'same-origin', signal },
      )
      if (response.status === 404) return undefined
      await ensureSuccess(response)
      return parseServiceEvent(await readJson(response))
    }, undefined, signal)
  }

  readonly create = async (
    command: CreateServiceEventCommand,
    signal?: AbortSignal,
  ): Promise<ServiceEvent> => {
    try {
      const response = await this.fetcher(this.baseUrl, {
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
      return parseServiceEvent(await readJson(response))
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
    throw new InvalidServiceEventResponseError()
  }
}
