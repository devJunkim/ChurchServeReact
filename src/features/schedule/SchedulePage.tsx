import { useState } from 'react'
import { ServiceEventCard } from './ServiceEventCard'
import type { ServiceEvent } from './serviceEvent'
import type { ScheduleState } from './scheduleState'
import './schedule.css'

const scheduledEvents: readonly ServiceEvent[] = [
  {
    id: 'sunday-2026-11-01',
    title: 'Sunday Morning Service',
    startsAt: '2026-11-01T10:00:00-05:00',
    endsAt: '2026-11-01T11:30:00-05:00',
    location: 'Main Sanctuary',
    requiredPositions: 10,
    assignedPositions: 7,
  },
  {
    id: 'rehearsal-2026-11-05',
    title: 'Worship Team Rehearsal',
    startsAt: '2026-11-05T19:00:00-05:00',
    endsAt: '2026-11-05T20:30:00-05:00',
    location: 'Music Room',
    requiredPositions: 6,
    assignedPositions: 6,
  },
]

type SchedulePageProps = {
  initialState?: ScheduleState
}

const defaultState: ScheduleState = {
  status: 'ready',
  events: scheduledEvents,
}

export function SchedulePage({
  initialState = defaultState,
}: SchedulePageProps) {
  const [state, setState] = useState<ScheduleState>(initialState)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const events = state.status === 'ready' ? state.events : []
  const selectedEvent = events.find((event) => event.id === selectedEventId)

  function reloadSchedule() {
    setSelectedEventId(null)
    setState(defaultState)
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

      {state.status === 'ready' && events.length === 0 && (
        <section className="state-panel empty-state">
          <h2>No upcoming services</h2>
          <p>New service events will appear here when they are scheduled.</p>
        </section>
      )}

      {state.status === 'ready' && events.length > 0 && (
        <ul className="event-grid">
          {events.map((event) => (
            <li key={event.id}>
              <ServiceEventCard event={event} onSelect={setSelectedEventId} />
            </li>
          ))}
        </ul>
      )}

      {selectedEvent && (
        <p className="selection-status" role="status">
          <strong>{selectedEvent.title}</strong> selected. Detailed scheduling
          will be added in a later part.
        </p>
      )}
    </section>
  )
}
