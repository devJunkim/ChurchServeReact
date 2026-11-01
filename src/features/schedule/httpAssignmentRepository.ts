import {
  browserCookieSource,
  readAntiforgeryToken,
  type CookieSource,
} from '../../core/auth/antiforgery'
import type { AssignVolunteerCommand } from './assignment'
import {
  AssignmentConflictError,
  type AssignmentRepository,
} from './assignmentRepository'
import {
  InvalidAssignmentResponseError,
  parseAssignmentBoard,
  parseAssignmentConflict,
  parseAssignVolunteerResult,
} from './assignmentValidation'
import {
  normalizeNetworkError,
  responseProblem,
} from '../../core/http/appProblem'
import { retryTransientRead } from '../../core/http/retryTransientRead'

type Fetch = typeof fetch

export class HttpAssignmentRepository implements AssignmentRepository {
  private readonly baseUrl: string
  private readonly fetcher: Fetch
  private readonly cookieSource: CookieSource

  constructor(
    baseUrl = '/api/service-events',
    fetcher: Fetch = globalThis.fetch,
    cookieSource: CookieSource = browserCookieSource,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.fetcher = fetcher
    this.cookieSource = cookieSource
  }

  readonly loadBoard = async (eventId: string, signal?: AbortSignal) => {
    return retryTransientRead(async () => {
      const response = await this.fetcher(
        `${this.baseUrl}/${encodeURIComponent(eventId)}/assignment-board`,
        { credentials: 'same-origin', signal },
      )
      await ensureSuccess(response)
      return parseAssignmentBoard(await readJson(response))
    }, undefined, signal)
  }

  readonly assign = async (
    command: AssignVolunteerCommand,
    signal?: AbortSignal,
  ) => {
    try {
      const response = await this.fetcher(
        `${this.baseUrl}/${encodeURIComponent(command.eventId)}/assignments`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': readAntiforgeryToken(this.cookieSource),
          },
          body: JSON.stringify({
            positionId: command.positionId,
            volunteerId: command.volunteerId,
            expectedEventVersion: command.expectedEventVersion,
            clientRequestId: command.clientRequestId,
          }),
          signal,
        },
      )
      if (response.status === 409) {
        const conflict = parseAssignmentConflict(await readJson(response))
        throw new AssignmentConflictError(conflict.message, conflict.board)
      }
      await ensureSuccess(response)
      return parseAssignVolunteerResult(await readJson(response))
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
    throw new InvalidAssignmentResponseError()
  }
}
