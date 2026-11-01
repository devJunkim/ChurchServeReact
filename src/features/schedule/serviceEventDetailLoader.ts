import type { LoaderFunction } from 'react-router'
import { isAbortError } from './requestError'
import type { ScheduleStore } from './scheduleStore'
import { toAppProblem } from '../../core/http/appProblem'

export function createServiceEventDetailLoader(
  store: Pick<ScheduleStore, 'findById'>,
): LoaderFunction {
  return async ({ params, request }) => {
    const eventId = params.eventId

    if (!eventId) {
      throw new Response(null, {
        status: 400,
        statusText: 'A service event ID is required.',
      })
    }

    let event
    try {
      event = await store.findById(eventId, request.signal)
    } catch (error) {
      if (request.signal.aborted || isAbortError(error)) {
        throw error
      }

      const problem = toAppProblem(error)
      const status =
        problem.kind === 'unauthenticated'
          ? 401
          : problem.kind === 'forbidden'
            ? 403
            : problem.kind === 'unavailable'
              ? 503
              : 500
      throw new Response(null, { status })
    }

    if (!event) {
      throw new Response(null, {
        status: 404,
        statusText: 'This service event was not found.',
      })
    }

    return event
  }
}
