import { memo } from 'react'
import { Link } from 'react-router'
import type { ServiceEvent } from './serviceEvent'

type ServiceEventCardProps = {
  event: ServiceEvent
}

const serviceDateFormatter = new Intl.DateTimeFormat('en-CA', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'America/Toronto',
})

export const ServiceEventCard = memo(function ServiceEventCard({
  event,
}: ServiceEventCardProps) {
  const openPositions = Math.max(
    0,
    event.requiredPositions - event.assignedPositions,
  )

  return (
    <article className="event-card">
      <div className="event-copy">
        <p className="event-date">
          <time dateTime={event.startsAt}>
            {serviceDateFormatter.format(new Date(event.startsAt))}
          </time>
        </p>
        <h2>{event.title}</h2>
        <p className="event-meta">
          <span>{event.location}</span>
        </p>
      </div>

      {openPositions === 0 ? (
        <p className="staffing complete">Fully staffed</p>
      ) : (
        <p className="staffing open">
          {openPositions} open {openPositions === 1 ? 'position' : 'positions'}
        </p>
      )}

      <Link
        className="event-action"
        to={`/schedule/${event.id}`}
        aria-label={`View ${event.title}`}
      >
        View schedule
      </Link>
    </article>
  )
})
