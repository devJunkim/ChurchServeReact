import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type {
  AssignmentBoard,
  AssignVolunteerCommand,
  AssignVolunteerResult,
} from './assignment'
import type { AssignmentRepository } from './assignmentRepository'
import { AssignmentStore } from './assignmentStore'
import { AssignmentStoreProvider } from './AssignmentStoreProvider'
import { AssignmentBoardPanel } from './AssignmentBoardPanel'
import { buildServiceEvent } from '../../testing/serviceEventBuilder'

describe('AssignmentBoardPanel', () => {
  it('renders an empty configured-position state after loading', async () => {
    const repository: AssignmentRepository = {
      loadBoard: async (eventId) => ({ ...board, eventId, positions: [] }),
      assign: async () => {
        throw new Error('Unexpected assignment.')
      },
    }

    renderPanel(repository)

    expect(
      await screen.findByRole('heading', { name: 'No assignable positions' }),
    ).toBeVisible()
  })

  it('shows an optimistic assignment before confirming it', async () => {
    const user = userEvent.setup()
    const request = deferred<AssignVolunteerResult>()
    let command: AssignVolunteerCommand | undefined
    const repository: AssignmentRepository = {
      loadBoard: async () => board,
      assign: async (value) => {
        command = value
        return request.promise
      },
    }

    renderPanel(repository)
    await user.selectOptions(
      await screen.findByLabelText('Volunteer'),
      'alex',
    )
    await user.click(screen.getByRole('button', { name: 'Assign' }))

    expect(screen.getByText('Saving…')).toBeVisible()
    expect(command).toMatchObject({
      positionId: 'sound-1',
      volunteerId: 'alex',
      expectedEventVersion: 1,
    })

    request.resolve({
      assignment: {
        id: 'assignment-1',
        positionId: 'sound-1',
        volunteerId: 'alex',
        volunteerDisplayName: 'Alex Morgan',
        status: 'accepted',
        syncStatus: 'confirmed',
      },
      eventVersion: 2,
      assignedPositions: 8,
    })

    expect(await screen.findByText('Confirmed')).toBeVisible()
    expect(screen.getByText('Schedule version 2')).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Alex Morgan was assigned.',
    )
  })

  it('keeps assignments readable without rendering management controls', async () => {
    const repository: AssignmentRepository = {
      loadBoard: async () => board,
      assign: async () => {
        throw new Error('Unexpected assignment.')
      },
    }

    renderPanel(repository, false)

    expect(await screen.findByText('Unfilled')).toBeVisible()
    expect(screen.queryByLabelText('Volunteer')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Assign' })).not.toBeInTheDocument()
  })
})

const board: AssignmentBoard = {
  eventId: 'sunday-2026-11-01',
  eventVersion: 1,
  assignedPositions: 7,
  positions: [
    {
      id: 'sound-1',
      eventId: 'sunday-2026-11-01',
      ministry: 'technical',
      roleName: 'Sound operator',
      startsAt: '2026-11-01T14:30:00Z',
      endsAt: '2026-11-01T16:30:00Z',
    },
  ],
  volunteers: [
    {
      id: 'alex',
      displayName: 'Alex Morgan',
      eligibleMinistries: ['technical'],
    },
  ],
  assignments: [],
}

function renderPanel(
  repository: AssignmentRepository,
  canManageSchedule = true,
) {
  const store = new AssignmentStore(repository, undefined, () => 'request-1')
  render(
    <AssignmentStoreProvider store={store}>
      <AssignmentBoardPanel
        event={buildServiceEvent()}
        canManageSchedule={canManageSchedule}
      />
    </AssignmentStoreProvider>,
  )
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}
