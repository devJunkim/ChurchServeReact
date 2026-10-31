import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import type { ServiceEvent } from './serviceEvent'
import { isAbortError } from './requestError'
import { useServiceEventRepository } from './serviceEventContext'
import './schedule.css'

const detailDateFormatter = new Intl.DateTimeFormat('en-CA', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'America/Toronto',
})

export function ServiceEventDetailPage() {
  const { eventId } = useParams<'eventId'>()
  const repository = useServiceEventRepository()
  const [requestVersion, setRequestVersion] = useState(0)
  const [state, setState] = useState<
    | { status: 'loading'; eventId: string | undefined }
    | { status: 'error'; eventId: string }
    | { status: 'not-found'; eventId: string }
    | { status: 'ready'; eventId: string; event: ServiceEvent }
  >({ status: 'loading', eventId })

  useEffect(() => {
    if (!eventId) {
      return
    }

    const controller = new AbortController()

    void repository
      .findById(eventId, controller.signal)
      .then((event) => {
        if (!controller.signal.aborted) {
          setState(
            event
              ? { status: 'ready', eventId, event }
              : { status: 'not-found', eventId },
          )
        }
      })
      .catch((error: unknown) => {
        if (!isAbortError(error)) {
          setState({ status: 'error', eventId })
        }
      })

    return () => controller.abort()
  }, [eventId, repository, requestVersion])

  const currentState =
    state.eventId === eventId
      ? state
      : { status: 'loading' as const, eventId }

  if (currentState.status === 'loading') {
    return (
      <section className="schedule-route-page" aria-labelledby="detail-heading">
        <Link className="back-link" to="/schedule">
          ← Back to schedule
        </Link>
        <h1 id="detail-heading">Service event</h1>
        <p className="state-panel" role="status">
          Loading the service event…
        </p>
      </section>
    )
  }

  if (currentState.status === 'error') {
    return (
      <section className="schedule-route-page" aria-labelledby="detail-heading">
        <Link className="back-link" to="/schedule">
          ← Back to schedule
        </Link>
        <div className="state-panel error-state" role="alert">
          <h1 id="detail-heading">We could not load this service</h1>
          <p>The scheduling service did not respond.</p>
          <button
            className="retry-action"
            type="button"
            onClick={() => {
              setState({ status: 'loading', eventId: currentState.eventId })
              setRequestVersion((version) => version + 1)
            }}
          >
            Try again
          </button>
        </div>
      </section>
    )
  }

  if (!eventId || currentState.status === 'not-found') {
    return (
      <section className="schedule-route-page" aria-labelledby="detail-heading">
        <Link className="back-link" to="/schedule">
          ← Back to schedule
        </Link>
        <div className="missing-event" role="alert">
          <p className="eyebrow">Service event</p>
          <h1 id="detail-heading">Service not found</h1>
          <p>This event does not exist or is no longer available.</p>
          <Link to="/schedule">Return to the schedule</Link>
        </div>
      </section>
    )
  }

  const { event } = currentState

  const openPositions = Math.max(
    0,
    event.requiredPositions - event.assignedPositions,
  )

  return (
    <section className="schedule-route-page" aria-labelledby="detail-heading">
      <Link className="back-link" to="/schedule">
        ← Back to schedule
      </Link>
      <p className="eyebrow">Service event</p>
      <h1 id="detail-heading">{event.title}</h1>

      <dl className="event-details">
        <div>
          <dt>Starts</dt>
          <dd>
            <time dateTime={event.startsAt}>
              {detailDateFormatter.format(new Date(event.startsAt))}
            </time>
          </dd>
        </div>
        <div>
          <dt>Ends</dt>
          <dd>
            <time dateTime={event.endsAt}>
              {detailDateFormatter.format(new Date(event.endsAt))}
            </time>
          </dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{event.location}</dd>
        </div>
        <div>
          <dt>Staffing</dt>
          <dd>{staffingLabel(event.requiredPositions, openPositions)}</dd>
        </div>
      </dl>
    </section>
  )
}

function staffingLabel(requiredPositions: number, openPositions: number) {
  if (requiredPositions === 0) {
    return 'No positions configured'
  }

  if (openPositions === 0) {
    return 'Fully staffed'
  }

  return `${openPositions} open ${
    openPositions === 1 ? 'position' : 'positions'
  }`
}
