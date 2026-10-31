import type { CreateServiceEventCommand } from './createServiceEvent'
import type { ServiceEvent } from './serviceEvent'
import type { ServiceEventRepository } from './serviceEventRepository'
import {
  InvalidServiceEventResponseError,
  parseServiceEvent,
  parseServiceEvents,
} from './serviceEventValidation'

type Fetch = typeof fetch

export class ServiceEventHttpError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`The service-event request failed with status ${status}.`)
    this.name = 'ServiceEventHttpError'
    this.status = status
  }
}

export class HttpServiceEventRepository implements ServiceEventRepository {
  private readonly baseUrl: string
  private readonly fetcher: Fetch

  constructor(
    baseUrl = '/api/service-events',
    fetcher: Fetch = globalThis.fetch,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.fetcher = fetcher
  }

  readonly list = async (signal?: AbortSignal) => {
    const response = await this.fetcher(this.baseUrl, { signal })
    await ensureSuccess(response)
    return parseServiceEvents(await readJson(response))
  }

  readonly findById = async (eventId: string, signal?: AbortSignal) => {
    const response = await this.fetcher(
      `${this.baseUrl}/${encodeURIComponent(eventId)}`,
      { signal },
    )

    if (response.status === 404) {
      return undefined
    }

    await ensureSuccess(response)
    return parseServiceEvent(await readJson(response))
  }

  readonly create = async (
    command: CreateServiceEventCommand,
    signal?: AbortSignal,
  ): Promise<ServiceEvent> => {
    const response = await this.fetcher(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
      signal,
    })

    await ensureSuccess(response)
    return parseServiceEvent(await readJson(response))
  }
}

async function ensureSuccess(response: Response) {
  if (!response.ok) {
    throw new ServiceEventHttpError(response.status)
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new InvalidServiceEventResponseError()
  }
}
