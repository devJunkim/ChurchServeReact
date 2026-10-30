import type { Assignment, MinistryPosition, Volunteer } from './assignment'

export type AssignmentState = {
  readonly positions: readonly MinistryPosition[]
  readonly volunteers: readonly Volunteer[]
  readonly assignments: readonly Assignment[]
}

export type AssignmentAction =
  | {
      type: 'assignment/proposed'
      assignmentId: string
      positionId: string
      volunteerId: string
    }
  | { type: 'assignment/declined'; assignmentId: string }

export type AssignmentValidation =
  | { valid: true }
  | { valid: false; message: string }

export function assignmentReducer(
  state: AssignmentState,
  action: AssignmentAction,
): AssignmentState {
  switch (action.type) {
    case 'assignment/proposed': {
      const validation = validateAssignment(
        action.positionId,
        action.volunteerId,
        state,
      )

      if (!validation.valid) {
        return state
      }

      return {
        ...state,
        assignments: [
          ...state.assignments,
          {
            id: action.assignmentId,
            positionId: action.positionId,
            volunteerId: action.volunteerId,
            status: 'proposed',
          },
        ],
      }
    }

    case 'assignment/declined': {
      if (!state.assignments.some(({ id }) => id === action.assignmentId)) {
        return state
      }

      return {
        ...state,
        assignments: state.assignments.map((assignment) =>
          assignment.id === action.assignmentId
            ? { ...assignment, status: 'declined' as const }
            : assignment,
        ),
      }
    }
  }
}

export function selectOpenPositions(
  state: AssignmentState,
): readonly MinistryPosition[] {
  const occupiedPositionIds = new Set(
    state.assignments
      .filter(({ status }) => status !== 'declined')
      .map(({ positionId }) => positionId),
  )

  return state.positions.filter(
    ({ id }) => !occupiedPositionIds.has(id),
  )
}

export function validateAssignment(
  positionId: string,
  volunteerId: string,
  state: AssignmentState,
): AssignmentValidation {
  const position = state.positions.find(({ id }) => id === positionId)
  if (!position) {
    return { valid: false, message: 'Position was not found.' }
  }

  const volunteer = state.volunteers.find(({ id }) => id === volunteerId)
  if (!volunteer) {
    return { valid: false, message: 'Volunteer was not found.' }
  }

  if (!volunteer.eligibleMinistries.includes(position.ministry)) {
    return {
      valid: false,
      message: 'Volunteer is not eligible for this ministry.',
    }
  }

  const occupied = state.assignments.some(
    (assignment) =>
      assignment.positionId === positionId &&
      assignment.status !== 'declined',
  )

  return occupied
    ? { valid: false, message: 'Position already has an assignment.' }
    : { valid: true }
}
