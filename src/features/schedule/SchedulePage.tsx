import { useEffect } from 'react'
import { Link } from 'react-router'
import { ServiceEventCard } from './ServiceEventCard'
import {
  useScheduleSnapshot,
  useScheduleStore,
} from './scheduleStoreContext'
import './schedule.css'
import { hasPermission, PERMISSIONS } from '../../core/auth/session'
import { useSession } from '../../core/auth/sessionContext'

export function SchedulePage() {
  const store = useScheduleStore()
  const state = useScheduleSnapshot()
  const { state: session } = useSession()
  const canManageSchedule =
    session.status === 'authenticated' &&
    hasPermission(session.user, PERMISSIONS.scheduleManage)

  useEffect(() => {
    void store.load()
  }, [store])

  return (
    <section className="schedule-page" aria-labelledby="schedule-heading">
      <p className="eyebrow">Schedule</p>
      <h1 id="schedule-heading">Upcoming services</h1>
      <p className="schedule-introduction">
        Review each event&apos;s time, location, and current volunteer coverage.
        Detailed assignments arrive in later parts of the tutorial.
      </p>

      {state.status === 'loading' && (
        <p className="state-panel" role="status">
          Loading the service schedule…
        </p>
      )}

      {state.status === 'error' && (
        <section className="state-panel error-state" role="alert">
          <h2>We could not load the schedule</h2>
          <p>{state.message}</p>
          <button
            className="retry-action"
            type="button"
            onClick={() => void store.retry()}
          >
            Try again
          </button>
        </section>
      )}

      {state.status === 'ready' && (
        <>
          <section
            className="schedule-summary"
            aria-label="Current schedule summary"
          >
            <p>
              <strong>{state.events.length}</strong> upcoming services
            </p>
            <p>
              <strong>{state.totalOpenPositions}</strong> open positions
            </p>
          </section>

          {canManageSchedule && (
            <div className="schedule-actions">
              <Link className="primary-link" to="/schedule/new">
                Create service
              </Link>
            </div>
          )}

          {state.events.length === 0 ? (
            <section className="state-panel empty-state">
              <h2>No upcoming services</h2>
              <p>Create an event when the next schedule is ready.</p>
            </section>
          ) : (
            <ul className="event-grid" aria-label="Service events">
              {state.events.map((event) => (
                <li key={event.id}>
                  <ServiceEventCard event={event} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
