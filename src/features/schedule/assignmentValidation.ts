import type {
  Assignment,
  AssignmentBoard,
  AssignVolunteerResult,
  MinistryPosition,
  Volunteer,
} from './assignment'

export class InvalidAssignmentResponseError extends Error {
  constructor() {
    super('The assignment response did not match the expected schema.')
    this.name = 'InvalidAssignmentResponseError'
  }
}

export function parseAssignmentBoard(value: unknown): AssignmentBoard {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.eventId) ||
    !isPositiveInteger(value.eventVersion) ||
    !isNonNegativeInteger(value.assignedPositions) ||
    !Array.isArray(value.positions) ||
    !Array.isArray(value.volunteers) ||
    !Array.isArray(value.assignments)
  ) {
    throw new InvalidAssignmentResponseError()
  }

  return {
    eventId: value.eventId,
    eventVersion: value.eventVersion,
    assignedPositions: value.assignedPositions,
    positions: value.positions.map(parsePosition),
    volunteers: value.volunteers.map(parseVolunteer),
    assignments: value.assignments.map(parseAssignment),
  }
}

export function parseAssignVolunteerResult(
  value: unknown,
): AssignVolunteerResult {
  if (
    !isRecord(value) ||
    !isPositiveInteger(value.eventVersion) ||
    !isNonNegativeInteger(value.assignedPositions)
  ) {
    throw new InvalidAssignmentResponseError()
  }

  return {
    assignment: parseAssignment(value.assignment),
    eventVersion: value.eventVersion,
    assignedPositions: value.assignedPositions,
  }
}

export function parseAssignmentConflict(value: unknown) {
  if (!isRecord(value) || !isNonEmptyString(value.message)) {
    throw new InvalidAssignmentResponseError()
  }

  return {
    message: value.message,
    board: parseAssignmentBoard(value.board),
  }
}

function parsePosition(value: unknown): MinistryPosition {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.eventId) ||
    !isNonEmptyString(value.ministry) ||
    !isNonEmptyString(value.roleName) ||
    !isDateString(value.startsAt) ||
    !isDateString(value.endsAt) ||
    Date.parse(value.endsAt) <= Date.parse(value.startsAt)
  ) {
    throw new InvalidAssignmentResponseError()
  }

  return {
    id: value.id,
    eventId: value.eventId,
    ministry: value.ministry,
    roleName: value.roleName,
    startsAt: value.startsAt,
    endsAt: value.endsAt,
  }
}

function parseVolunteer(value: unknown): Volunteer {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.displayName) ||
    !Array.isArray(value.eligibleMinistries) ||
    !value.eligibleMinistries.every(isNonEmptyString)
  ) {
    throw new InvalidAssignmentResponseError()
  }

  return {
    id: value.id,
    displayName: value.displayName,
    eligibleMinistries: [...value.eligibleMinistries],
  }
}

function parseAssignment(value: unknown): Assignment {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.positionId) ||
    !isNonEmptyString(value.volunteerId) ||
    !isNonEmptyString(value.volunteerDisplayName) ||
    (value.status !== 'accepted' && value.status !== 'declined')
  ) {
    throw new InvalidAssignmentResponseError()
  }

  return {
    id: value.id,
    positionId: value.positionId,
    volunteerId: value.volunteerId,
    volunteerDisplayName: value.volunteerDisplayName,
    status: value.status,
    syncStatus: 'confirmed',
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isDateString(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value))
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0
}
