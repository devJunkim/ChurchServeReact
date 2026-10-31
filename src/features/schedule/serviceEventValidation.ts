import type { ServiceEvent } from './serviceEvent'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0
}

export function isServiceEvent(value: unknown): value is ServiceEvent {
  if (!isRecord(value)) {
    return false
  }

  const startsAt = Date.parse(String(value.startsAt))
  const endsAt = Date.parse(String(value.endsAt))

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.title) &&
    isNonEmptyString(value.startsAt) &&
    isNonEmptyString(value.endsAt) &&
    isNonEmptyString(value.location) &&
    !Number.isNaN(startsAt) &&
    !Number.isNaN(endsAt) &&
    endsAt > startsAt &&
    isNonNegativeInteger(value.requiredPositions) &&
    isNonNegativeInteger(value.assignedPositions) &&
    value.assignedPositions <= value.requiredPositions &&
    Number.isInteger(value.version) &&
    Number(value.version) > 0
  )
}

export function parseServiceEvent(value: unknown): ServiceEvent {
  if (!isServiceEvent(value)) {
    throw new InvalidServiceEventResponseError()
  }

  return { ...value }
}

export function parseServiceEvents(value: unknown): readonly ServiceEvent[] {
  if (!Array.isArray(value) || !value.every(isServiceEvent)) {
    throw new InvalidServiceEventResponseError()
  }

  return value.map((event) => ({ ...event }))
}

export class InvalidServiceEventResponseError extends Error {
  constructor() {
    super('The service-event response did not match the expected schema.')
    this.name = 'InvalidServiceEventResponseError'
  }
}
