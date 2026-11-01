import { Link, useLoaderData } from 'react-router'
import type { ServiceEvent } from './serviceEvent'
import { AssignmentBoardPanel } from './AssignmentBoardPanel'
import './schedule.css'
import { hasPermission, PERMISSIONS } from '../../core/auth/session'
import { useSession } from '../../core/auth/sessionContext'

const detailDateFormatter = new Intl.DateTimeFormat('en-CA', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'America/Toronto',
})

export function ServiceEventDetailPage() {
  const event = useLoaderData() as ServiceEvent
  const { state: session } = useSession()
  const canManageSchedule =
    session.status === 'authenticated' &&
    hasPermission(session.user, PERMISSIONS.scheduleManage)

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

      <AssignmentBoardPanel
        event={event}
        canManageSchedule={canManageSchedule}
      />
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
