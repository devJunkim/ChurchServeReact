import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Link,
  useBeforeUnload,
  useBlocker,
  useNavigate,
} from 'react-router'
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
  const [isDirty, setIsDirty] = useState(false)
  const hasSaved = useRef(false)
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        isDirty &&
        !hasSaved.current &&
        (currentLocation.pathname !== nextLocation.pathname ||
          currentLocation.search !== nextLocation.search),
      [isDirty],
    ),
  )

  useBeforeUnload(
    useCallback(
      (event) => {
        if (isDirty && !hasSaved.current) {
          event.preventDefault()
          event.returnValue = ''
        }
      },
      [isDirty],
    ),
  )

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
      hasSaved.current = true
      setIsDirty(false)
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
        onDirtyChange={setIsDirty}
        onSubmit={createServiceEvent}
      />

      {blocker.state === 'blocked' && (
        <section
          className="discard-confirmation"
          role="alertdialog"
          aria-labelledby="discard-heading"
          aria-describedby="discard-description"
        >
          <h2 id="discard-heading">Discard this service event?</h2>
          <p id="discard-description">
            Your unsaved entries will be lost if you leave this page.
          </p>
          <div className="discard-actions">
            <button type="button" onClick={() => blocker.reset()}>
              Keep editing
            </button>
            <button
              className="danger-action"
              type="button"
              onClick={() => blocker.proceed()}
            >
              Discard and leave
            </button>
          </div>
        </section>
      )}
    </section>
  )
}
