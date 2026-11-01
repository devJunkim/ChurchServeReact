import { useState, type FormEvent } from 'react'
import {
  parseServiceEventForm,
  type CreateServiceEventCommand,
  type ServiceEventFormErrors,
  type ServiceEventFormValues,
} from './createServiceEvent'

type ServiceEventFormProps = {
  isSubmitting?: boolean
  submissionError?: string
  serverErrors?: ServiceEventFormErrors
  onServerErrorsClear?: () => void
  onDirtyChange?: (isDirty: boolean) => void
  onSubmit: (command: CreateServiceEventCommand) => Promise<void>
}

const emptyValues: ServiceEventFormValues = {
  title: '',
  startsAt: '',
  endsAt: '',
  location: '',
}

const deviceTimeZone =
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'your device time zone'

export function ServiceEventForm({
  isSubmitting = false,
  submissionError,
  serverErrors,
  onServerErrorsClear,
  onDirtyChange,
  onSubmit,
}: ServiceEventFormProps) {
  const [values, setValues] = useState<ServiceEventFormValues>(emptyValues)
  const [errors, setErrors] = useState<ServiceEventFormErrors>({})
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const displayedErrors = { ...errors, ...serverErrors }
  const showErrorSummary =
    hasSubmitted || Object.keys(serverErrors ?? {}).length > 0

  function updateField(field: keyof ServiceEventFormValues, value: string) {
    const nextValues = { ...values, [field]: value }
    setValues(nextValues)
    onServerErrorsClear?.()
    onDirtyChange?.(
      Object.values(nextValues).some((fieldValue) => fieldValue.length > 0),
    )

    if (hasSubmitted) {
      const result = parseServiceEventForm(nextValues)
      setErrors(result.valid ? {} : result.errors)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) {
      return
    }
    setHasSubmitted(true)

    const result = parseServiceEventForm(values)
    if (!result.valid) {
      setErrors(result.errors)
      return
    }

    try {
      await onSubmit(result.command)
      setValues(emptyValues)
      onDirtyChange?.(false)
      setErrors({})
      setHasSubmitted(false)
    } catch {
      // The route owns request feedback and preserves these form values.
    }
  }

  const hasErrors = Object.keys(displayedErrors).length > 0
  const timeRangeError = displayedErrors.timeRange

  return (
    <section className="event-form-panel" aria-labelledby="event-form-heading">
      <div className="form-heading">
        <p className="eyebrow">New event</p>
        <h2 id="event-form-heading">Create a service</h2>
        <p>
          Enter the service details now. Staffing positions can be added later.
        </p>
      </div>

      <form
        className="service-event-form"
        noValidate
        aria-busy={isSubmitting}
        onSubmit={handleSubmit}
      >
        {submissionError && (
          <p className="form-error-summary field-wide" role="alert">
            {submissionError}
          </p>
        )}
        {showErrorSummary && hasErrors && (
          <p className="form-error-summary field-wide" role="alert">
            Review the highlighted fields and try again.
          </p>
        )}

        <div className="form-field field-wide">
          <label htmlFor="service-title">Service name</label>
          <input
            id="service-title"
            name="title"
            type="text"
            value={values.title}
            maxLength={120}
            autoComplete="off"
            aria-invalid={Boolean(displayedErrors.title)}
            aria-describedby={
              displayedErrors.title ? 'service-title-error' : undefined
            }
            onChange={(event) => updateField('title', event.target.value)}
          />
          {displayedErrors.title && (
            <p id="service-title-error" className="field-error">
              {displayedErrors.title}
            </p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="service-start">Starts</label>
          <input
            id="service-start"
            name="startsAt"
            type="datetime-local"
            value={values.startsAt}
            aria-invalid={Boolean(displayedErrors.startsAt || timeRangeError)}
            aria-describedby={descriptionIds(
              'service-time-zone',
              displayedErrors.startsAt ? 'service-start-error' : undefined,
              timeRangeError ? 'service-time-error' : undefined,
            )}
            onChange={(event) => updateField('startsAt', event.target.value)}
          />
          {displayedErrors.startsAt && (
            <p id="service-start-error" className="field-error">
              {displayedErrors.startsAt}
            </p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="service-end">Ends</label>
          <input
            id="service-end"
            name="endsAt"
            type="datetime-local"
            value={values.endsAt}
            aria-invalid={Boolean(displayedErrors.endsAt || timeRangeError)}
            aria-describedby={descriptionIds(
              'service-time-zone',
              displayedErrors.endsAt ? 'service-end-error' : undefined,
              timeRangeError ? 'service-time-error' : undefined,
            )}
            onChange={(event) => updateField('endsAt', event.target.value)}
          />
          {displayedErrors.endsAt && (
            <p id="service-end-error" className="field-error">
              {displayedErrors.endsAt}
            </p>
          )}
        </div>

        <p id="service-time-zone" className="field-help field-wide">
          Times use this device&apos;s time zone: {deviceTimeZone}.
        </p>

        {timeRangeError && (
          <p id="service-time-error" className="field-error field-wide">
            {timeRangeError}
          </p>
        )}

        <div className="form-field field-wide">
          <label htmlFor="service-location">Location</label>
          <input
            id="service-location"
            name="location"
            type="text"
            value={values.location}
            maxLength={120}
            autoComplete="off"
            aria-invalid={Boolean(displayedErrors.location)}
            aria-describedby={
              displayedErrors.location ? 'service-location-error' : undefined
            }
            onChange={(event) => updateField('location', event.target.value)}
          />
          {displayedErrors.location && (
            <p id="service-location-error" className="field-error">
              {displayedErrors.location}
            </p>
          )}
        </div>

        <div className="form-actions field-wide">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Adding to schedule…' : 'Add to schedule'}
          </button>
        </div>
      </form>
    </section>
  )
}

function descriptionIds(...ids: Array<string | undefined>): string {
  return ids.filter((id): id is string => Boolean(id)).join(' ')
}
