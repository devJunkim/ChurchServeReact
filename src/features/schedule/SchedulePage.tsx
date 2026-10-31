import { useState } from 'react'
import { Link } from 'react-router'
import { ServiceEventCard } from './ServiceEventCard'
import type { ScheduleState } from './scheduleState'
import { useServiceEvents } from './serviceEventContext'
import './schedule.css'

type SchedulePageProps = {
  initialState?: ScheduleState
}

export function SchedulePage({
  initialState,
}: SchedulePageProps) {
  const storedEvents = useServiceEvents()
  const [stateOverride, setStateOverride] = useState<ScheduleState | undefined>(
    initialState,
  )
  const state: ScheduleState = stateOverride ?? {
    status: 'ready',
    events: storedEvents,
  }
  const events = state.status === 'ready' ? state.events : []

  function reloadSchedule() {
    setStateOverride(undefined)
  }

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
            onClick={reloadSchedule}
          >
            Try again
          </button>
        </section>
      )}

      {state.status === 'ready' && (
        <>
          <div className="schedule-actions">
            <Link className="primary-link" to="/schedule/new">
              Create service
            </Link>
          </div>

          {events.length === 0 ? (
            <section className="state-panel empty-state">
              <h2>No upcoming services</h2>
              <p>Create an event when the next schedule is ready.</p>
            </section>
          ) : (
            <ul className="event-grid">
              {events.map((event) => (
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
