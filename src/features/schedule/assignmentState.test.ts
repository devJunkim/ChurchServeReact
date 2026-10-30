import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Assignment, MinistryPosition, Volunteer } from './assignment'
import {
  assignmentReducer,
  selectOpenPositions,
  validateAssignment,
  type AssignmentState,
} from './assignmentState'
import { useAssignmentState } from './useAssignmentState'

const positions: readonly MinistryPosition[] = [
  {
    id: 'sound-1',
    eventId: 'event-1',
    ministry: 'technical',
    roleName: 'Sound operator',
    startsAt: '2026-11-01T09:30:00-05:00',
    endsAt: '2026-11-01T11:30:00-05:00',
  },
]

const volunteers: readonly Volunteer[] = [
  {
    id: 'technical-volunteer',
    displayName: 'Alex',
    eligibleMinistries: ['technical'],
  },
  {
    id: 'welcome-volunteer',
    displayName: 'Jordan',
    eligibleMinistries: ['welcome'],
  },
]

describe('validateAssignment', () => {
  it('rejects an unknown position', () => {
    expect(
      validateAssignment('missing', 'technical-volunteer', createState()),
    ).toEqual({ valid: false, message: 'Position was not found.' })
  })

  it('rejects an unknown volunteer', () => {
    expect(validateAssignment('sound-1', 'missing', createState())).toEqual({
      valid: false,
      message: 'Volunteer was not found.',
    })
  })

  it('rejects a volunteer outside the required ministry', () => {
    expect(
      validateAssignment('sound-1', 'welcome-volunteer', createState()),
    ).toEqual({
      valid: false,
      message: 'Volunteer is not eligible for this ministry.',
    })
  })

  it('rejects a position occupied by an active assignment', () => {
    expect(
      validateAssignment(
        'sound-1',
        'technical-volunteer',
        createState([
          {
            id: 'assignment-1',
            positionId: 'sound-1',
            volunteerId: 'technical-volunteer',
            status: 'accepted',
          },
        ]),
      ),
    ).toEqual({
      valid: false,
      message: 'Position already has an assignment.',
    })
  })

  it('allows a declined assignment to be replaced', () => {
    expect(
      validateAssignment(
        'sound-1',
        'technical-volunteer',
        createState([
          {
            id: 'assignment-1',
            positionId: 'sound-1',
            volunteerId: 'technical-volunteer',
            status: 'declined',
          },
        ]),
      ),
    ).toEqual({ valid: true })
  })
})

describe('assignmentReducer', () => {
  it('proposes an assignment and derives no open positions', () => {
    const state = createState()
    const nextState = assignmentReducer(state, {
      type: 'assignment/proposed',
      assignmentId: 'assignment-1',
      positionId: 'sound-1',
      volunteerId: 'technical-volunteer',
    })

    expect(nextState).not.toBe(state)
    expect(nextState.assignments).toEqual([
      {
        id: 'assignment-1',
        positionId: 'sound-1',
        volunteerId: 'technical-volunteer',
        status: 'proposed',
      },
    ])
    expect(selectOpenPositions(nextState)).toEqual([])
  })

  it('declines an assignment and reopens its position', () => {
    const state = createState([
      {
        id: 'assignment-1',
        positionId: 'sound-1',
        volunteerId: 'technical-volunteer',
        status: 'proposed',
      },
    ])

    const nextState = assignmentReducer(state, {
      type: 'assignment/declined',
      assignmentId: 'assignment-1',
    })

    expect(nextState.assignments[0].status).toBe('declined')
    expect(selectOpenPositions(nextState)).toEqual(positions)
  })

  it('preserves state when a proposed assignment is invalid', () => {
    const state = createState()

    const nextState = assignmentReducer(state, {
      type: 'assignment/proposed',
      assignmentId: 'assignment-1',
      positionId: 'sound-1',
      volunteerId: 'welcome-volunteer',
    })

    expect(nextState).toBe(state)
  })

  it('preserves state when the declined assignment does not exist', () => {
    const state = createState()

    const nextState = assignmentReducer(state, {
      type: 'assignment/declined',
      assignmentId: 'missing',
    })

    expect(nextState).toBe(state)
  })
})

describe('useAssignmentState', () => {
  it('dispatches assignment commands through the reducer', () => {
    const { result } = renderHook(() =>
      useAssignmentState(createState(), () => 'assignment-1'),
    )

    act(() => {
      expect(result.current.assign('sound-1', 'technical-volunteer')).toEqual({
        valid: true,
      })
    })

    expect(result.current.openPositions).toEqual([])
    expect(result.current.state.assignments[0].id).toBe('assignment-1')

    act(() => {
      expect(result.current.decline('assignment-1')).toBe(true)
    })

    expect(result.current.openPositions).toEqual(positions)
  })
})

function createState(
  assignments: readonly Assignment[] = [],
): AssignmentState {
  return { positions, volunteers, assignments }
}
