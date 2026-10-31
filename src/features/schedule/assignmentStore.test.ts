import { describe, expect, it, vi } from 'vitest'
import type {
  AssignmentBoard,
  AssignVolunteerCommand,
  AssignVolunteerResult,
} from './assignment'
import {
  AssignmentConflictError,
  type AssignmentRepository,
} from './assignmentRepository'
import { AssignmentStore } from './assignmentStore'

describe('AssignmentStore', () => {
  it('loads the board and filters volunteers by ministry', async () => {
    const repository = new ControlledAssignmentRepository()
    const boardChanged = vi.fn()
    const store = new AssignmentStore(repository, boardChanged)
    const loading = store.load('event-1')

    expect(store.getSnapshot()).toEqual({
      status: 'loading',
      eventId: 'event-1',
    })

    repository.loadRequest.resolve(board)
    await loading

    expect(store.getSnapshot()).toMatchObject({
      status: 'ready',
      eventVersion: 1,
    })
    expect(store.volunteersFor(board.positions[0])).toEqual([
      board.volunteers[0],
    ])
    expect(boardChanged).toHaveBeenCalledWith('event-1', 7, 1)
  })

  it('adds a pending assignment and confirms only the matching request', async () => {
    const repository = new ControlledAssignmentRepository()
    const store = new AssignmentStore(repository, undefined, () => 'request-1')
    await loadBoard(store, repository)

    expect(store.assign('sound-1', 'alex')).toEqual({ valid: true })
    expect(repository.assignCalls[0]).toEqual({
      eventId: 'event-1',
      positionId: 'sound-1',
      volunteerId: 'alex',
      expectedEventVersion: 1,
      clientRequestId: 'request-1',
    })
    expect(ready(store).assignments[0]).toMatchObject({
      id: 'pending-request-1',
      syncStatus: 'pending',
    })

    repository.assignRequests[0].resolve({
      assignment: confirmedAssignment('assignment-1', 'sound-1'),
      eventVersion: 2,
      assignedPositions: 8,
    })
    await settle()

    expect(ready(store)).toMatchObject({
      eventVersion: 2,
      assignedPositions: 8,
      notice: { kind: 'success', message: 'Alex Morgan was assigned.' },
    })
    expect(ready(store).assignments[0].syncStatus).toBe('confirmed')
  })

  it('rolls back only the failed optimistic operation', async () => {
    const repository = new ControlledAssignmentRepository()
    let request = 0
    const store = new AssignmentStore(
      repository,
      undefined,
      () => `request-${++request}`,
    )
    await loadBoard(store, repository)

    store.assign('sound-1', 'alex')
    store.assign('camera-1', 'alex')
    repository.assignRequests[0].reject(new Error('offline'))
    await settle()

    expect(ready(store).assignments).toHaveLength(1)
    expect(ready(store).assignments[0].positionId).toBe('camera-1')
    expect(ready(store).notice?.kind).toBe('error')
  })

  it('reconciles a conflict and ignores older in-flight responses', async () => {
    const repository = new ControlledAssignmentRepository()
    let request = 0
    const store = new AssignmentStore(
      repository,
      undefined,
      () => `request-${++request}`,
    )
    await loadBoard(store, repository)
    store.assign('sound-1', 'alex')
    store.assign('camera-1', 'alex')

    const authoritative = {
      ...board,
      eventVersion: 2,
      assignedPositions: 8,
      assignments: [confirmedAssignment('other-assignment', 'sound-1')],
    }
    repository.assignRequests[0].reject(
      new AssignmentConflictError('The schedule changed.', authoritative),
    )
    await settle()

    repository.assignRequests[1].resolve({
      assignment: confirmedAssignment('late-assignment', 'camera-1'),
      eventVersion: 2,
      assignedPositions: 8,
    })
    await settle()

    expect(ready(store).assignments).toEqual(authoritative.assignments)
    expect(ready(store).notice).toEqual({
      kind: 'conflict',
      message: 'The schedule changed. The latest assignments are shown.',
    })
  })

  it('rejects an ineligible volunteer before calling the repository', async () => {
    const repository = new ControlledAssignmentRepository()
    const store = new AssignmentStore(repository)
    await loadBoard(store, repository)

    expect(store.assign('sound-1', 'jordan')).toEqual({
      valid: false,
      message: 'Volunteer is not eligible for this ministry.',
    })
    expect(repository.assignCalls).toEqual([])
  })
})

const board: AssignmentBoard = {
  eventId: 'event-1',
  eventVersion: 1,
  assignedPositions: 7,
  positions: [
    {
      id: 'sound-1',
      eventId: 'event-1',
      ministry: 'technical',
      roleName: 'Sound operator',
      startsAt: '2026-11-01T14:30:00Z',
      endsAt: '2026-11-01T16:30:00Z',
    },
    {
      id: 'camera-1',
      eventId: 'event-1',
      ministry: 'technical',
      roleName: 'Camera operator',
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
    {
      id: 'jordan',
      displayName: 'Jordan Kim',
      eligibleMinistries: ['welcome'],
    },
  ],
  assignments: [],
}

function confirmedAssignment(id: string, positionId: string) {
  return {
    id,
    positionId,
    volunteerId: 'alex',
    volunteerDisplayName: 'Alex Morgan',
    status: 'accepted' as const,
    syncStatus: 'confirmed' as const,
  }
}

class ControlledAssignmentRepository implements AssignmentRepository {
  readonly loadRequest = deferred<AssignmentBoard>()
  readonly assignCalls: AssignVolunteerCommand[] = []
  readonly assignRequests: Array<Deferred<AssignVolunteerResult>> = []

  readonly loadBoard = () => this.loadRequest.promise

  readonly assign = (command: AssignVolunteerCommand) => {
    this.assignCalls.push(command)
    const request = deferred<AssignVolunteerResult>()
    this.assignRequests.push(request)
    return request.promise
  }
}

type Deferred<T> = {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
  readonly reject: (reason: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

async function loadBoard(
  store: AssignmentStore,
  repository: ControlledAssignmentRepository,
) {
  const loading = store.load('event-1')
  repository.loadRequest.resolve(board)
  await loading
}

function ready(store: AssignmentStore) {
  const snapshot = store.getSnapshot()
  if (snapshot.status !== 'ready') throw new Error('Expected a ready board.')
  return snapshot
}

async function settle() {
  await Promise.resolve()
  await Promise.resolve()
}
