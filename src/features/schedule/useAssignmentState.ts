import { useReducer } from 'react'
import type { AssignmentState, AssignmentValidation } from './assignmentState'
import {
  assignmentReducer,
  selectOpenPositions,
  validateAssignment,
} from './assignmentState'

type AssignmentIdFactory = () => string

const createAssignmentId: AssignmentIdFactory = () => crypto.randomUUID()

function copyInitialState(state: AssignmentState): AssignmentState {
  return {
    positions: [...state.positions],
    volunteers: [...state.volunteers],
    assignments: [...state.assignments],
  }
}

export function useAssignmentState(
  initialState: AssignmentState,
  idFactory: AssignmentIdFactory = createAssignmentId,
) {
  const [state, dispatch] = useReducer(
    assignmentReducer,
    initialState,
    copyInitialState,
  )

  function assign(
    positionId: string,
    volunteerId: string,
  ): AssignmentValidation {
    const validation = validateAssignment(positionId, volunteerId, state)

    if (!validation.valid) {
      return validation
    }

    dispatch({
      type: 'assignment/proposed',
      assignmentId: idFactory(),
      positionId,
      volunteerId,
    })

    return validation
  }

  function decline(assignmentId: string): boolean {
    if (!state.assignments.some(({ id }) => id === assignmentId)) {
      return false
    }

    dispatch({ type: 'assignment/declined', assignmentId })
    return true
  }

  return {
    state,
    openPositions: selectOpenPositions(state),
    assign,
    decline,
  }
}
