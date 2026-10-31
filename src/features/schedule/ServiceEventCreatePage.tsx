import { Link, useNavigate } from 'react-router'
import { ServiceEventForm } from './ServiceEventForm'
import type { CreateServiceEventCommand } from './createServiceEvent'
import { useServiceEvents } from './serviceEventContext'
import './schedule.css'

export function ServiceEventCreatePage() {
  const navigate = useNavigate()
  const { create } = useServiceEvents()

  function createServiceEvent(command: CreateServiceEventCommand) {
    const event = create(command)
    void navigate(`/schedule/${event.id}`)
  }

  return (
    <section className="schedule-route-page" aria-labelledby="create-heading">
      <Link className="back-link" to="/schedule">
        ← Back to schedule
      </Link>
      <p className="eyebrow">Schedule</p>
      <h1 id="create-heading">Create a service event</h1>
      <p className="schedule-introduction">
        Add the service details. After validation succeeds, ChurchServe opens
        the new event&apos;s stable detail URL.
      </p>

      <ServiceEventForm onSubmit={createServiceEvent} />
    </section>
  )
}
