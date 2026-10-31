import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ServiceEventForm } from './ServiceEventForm'
import type { CreateServiceEventCommand } from './createServiceEvent'
import { isAbortError } from './requestError'
import { useServiceEventRepository } from './serviceEventContext'
import './schedule.css'

export function ServiceEventCreatePage() {
  const navigate = useNavigate()
  const repository = useServiceEventRepository()
  const activeRequest = useRef<AbortController | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string>()

  useEffect(
    () => () => {
      activeRequest.current?.abort()
      activeRequest.current = null
    },
    [],
  )

  async function createServiceEvent(command: CreateServiceEventCommand) {
    const controller = new AbortController()
    activeRequest.current = controller
    setIsSubmitting(true)
    setSubmissionError(undefined)

    try {
      const event = await repository.create(command, controller.signal)
      controller.signal.throwIfAborted()
      await navigate(`/schedule/${event.id}`)
    } catch (error) {
      if (!isAbortError(error)) {
        setSubmissionError(
          'We could not create the service event. Your entries are still here.',
        )
      }
      throw error
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null
        setIsSubmitting(false)
      }
    }
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

      <ServiceEventForm
        isSubmitting={isSubmitting}
        submissionError={submissionError}
        onSubmit={createServiceEvent}
      />
    </section>
  )
}
