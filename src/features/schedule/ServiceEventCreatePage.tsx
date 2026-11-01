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
import { useScheduleStore } from './scheduleStoreContext'
import './schedule.css'
import {
  toAppProblem,
  unexpectedProblemMessage,
} from '../../core/http/appProblem'
import type { ServiceEventFormErrors } from './createServiceEvent'

export function ServiceEventCreatePage() {
  const navigate = useNavigate()
  const store = useScheduleStore()
  const activeRequest = useRef<AbortController | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string>()
  const [serverErrors, setServerErrors] = useState<ServiceEventFormErrors>()
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
    setServerErrors(undefined)

    try {
      const event = await store.create(command, controller.signal)
      controller.signal.throwIfAborted()
      hasSaved.current = true
      setIsDirty(false)
      await navigate(`/schedule/${event.id}`)
    } catch (error) {
      if (!isAbortError(error)) {
        const problem = toAppProblem(error)
        if (problem.kind === 'validation') {
          const fieldErrors = serviceEventServerErrors(problem.fields)
          if (Object.keys(fieldErrors).length > 0) {
            setServerErrors(fieldErrors)
            setSubmissionError(undefined)
          } else {
            setSubmissionError(createEventMessage(problem))
          }
        } else {
          setSubmissionError(createEventMessage(problem))
        }
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
        serverErrors={serverErrors}
        onServerErrorsClear={() => setServerErrors(undefined)}
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

function serviceEventServerErrors(
  fields: Readonly<Record<string, string>>,
): ServiceEventFormErrors {
  const errors: ServiceEventFormErrors = {}
  for (const field of ['title', 'startsAt', 'endsAt', 'location'] as const) {
    if (fields[field]) errors[field] = fields[field]
  }
  return errors
}

function createEventMessage(problem: ReturnType<typeof toAppProblem>) {
  switch (problem.kind) {
    case 'validation':
      return 'The event was rejected. Review its details and try again.'
    case 'unauthenticated':
      return 'Your session expired. Sign in again before creating this event.'
    case 'forbidden':
      return 'Your account does not have permission to create service events.'
    case 'conflict':
      return 'The schedule changed while you were editing. Review it and try again.'
    case 'unavailable':
      return 'The event was not saved because the service is unavailable. Your entries are still here.'
    default:
      return unexpectedProblemMessage(
        problem,
        'The event could not be created. Your entries are still here.',
      )
  }
}
