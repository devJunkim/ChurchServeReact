import { Link, useLoaderData } from 'react-router'
import type { ServiceEvent } from './serviceEvent'
import './schedule.css'

const detailDateFormatter = new Intl.DateTimeFormat('en-CA', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'America/Toronto',
})

export function ServiceEventDetailPage() {
  const event = useLoaderData() as ServiceEvent

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

export function ServiceEventDetailLoadingPage() {
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
