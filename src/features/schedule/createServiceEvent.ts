export type CreateServiceEventCommand = {
  readonly title: string
  readonly startsAt: string
  readonly endsAt: string
  readonly location: string
}

export type ServiceEventFormValues = {
  readonly title: string
  readonly startsAt: string
  readonly endsAt: string
  readonly location: string
}

export type ServiceEventFormErrors = Partial<
  Record<keyof ServiceEventFormValues | 'timeRange', string>
>

export type ServiceEventFormResult =
  | { valid: true; command: CreateServiceEventCommand }
  | { valid: false; errors: ServiceEventFormErrors }

export function parseServiceEventForm(
  values: ServiceEventFormValues,
): ServiceEventFormResult {
  const errors: ServiceEventFormErrors = {}
  const title = values.title.trim()
  const location = values.location.trim()
  const start = Date.parse(values.startsAt)
  const end = Date.parse(values.endsAt)

  if (title.length === 0) {
    errors.title = 'Enter a service name.'
  } else if (title.length > 120) {
    errors.title = 'Service name must be 120 characters or fewer.'
  }

  if (values.startsAt.length === 0 || Number.isNaN(start)) {
    errors.startsAt = 'Enter a valid start date and time.'
  }

  if (values.endsAt.length === 0 || Number.isNaN(end)) {
    errors.endsAt = 'Enter a valid end date and time.'
  }

  if (!Number.isNaN(start) && !Number.isNaN(end) && end <= start) {
    errors.timeRange = 'End time must be after start time.'
  }

  if (location.length === 0) {
    errors.location = 'Enter a service location.'
  } else if (location.length > 120) {
    errors.location = 'Location must be 120 characters or fewer.'
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    command: {
      title,
      startsAt: new Date(values.startsAt).toISOString(),
      endsAt: new Date(values.endsAt).toISOString(),
      location,
    },
  }
}
