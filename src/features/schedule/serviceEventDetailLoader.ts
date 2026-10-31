import type { LoaderFunction } from 'react-router'
import { isAbortError } from './requestError'
import type { ServiceEventRepository } from './serviceEventRepository'

export function createServiceEventDetailLoader(
  repository: ServiceEventRepository,
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
      event = await repository.findById(eventId, request.signal)
    } catch (error) {
      if (request.signal.aborted || isAbortError(error)) {
        throw error
      }

      throw new Response(null, {
        status: 503,
        statusText: 'The scheduling service did not respond.',
      })
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
