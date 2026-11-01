import type {
  Assignment,
  AssignmentBoard,
  MinistryPosition,
  Volunteer,
} from './assignment'
import { RequestCache } from '../../core/data/requestCache'
import {
  AssignmentConflictError,
  type AssignmentRepository,
} from './assignmentRepository'
import { isAbortError } from './requestError'
import {
  toAppProblem,
  unexpectedProblemMessage,
} from '../../core/http/appProblem'

export type AssignmentNotice = {
  readonly kind: 'success' | 'error' | 'conflict'
  readonly message: string
}

type AssignmentIdleSnapshot = { readonly status: 'idle' }
type AssignmentLoadingSnapshot = {
  readonly status: 'loading'
  readonly eventId: string
}
type AssignmentErrorSnapshot = {
  readonly status: 'error'
  readonly eventId: string
  readonly message: string
}
export type AssignmentReadySnapshot = AssignmentBoard & {
  readonly status: 'ready'
  readonly notice?: AssignmentNotice
}

export type AssignmentSnapshot =
  | AssignmentIdleSnapshot
  | AssignmentLoadingSnapshot
  | AssignmentErrorSnapshot
  | AssignmentReadySnapshot

export type AssignmentValidation =
  | { readonly valid: true }
  | { readonly valid: false; readonly message: string }

type Listener = () => void
type AssignmentIdFactory = () => string
type BoardChanged = (
  eventId: string,
  assignedPositions: number,
  eventVersion: number,
) => void

const idleSnapshot: AssignmentIdleSnapshot = { status: 'idle' }
const createRequestId: AssignmentIdFactory = () => crypto.randomUUID()
const noVolunteers: readonly Volunteer[] = []

export class AssignmentStore {
  private readonly repository: AssignmentRepository
  private readonly onBoardChanged: BoardChanged
  private readonly idFactory: AssignmentIdFactory
  private readonly boardCache: RequestCache<string, AssignmentBoard>
  private snapshot: AssignmentSnapshot = idleSnapshot
  private readonly listeners = new Set<Listener>()
  private activeLoad?: { readonly eventId: string; readonly promise: Promise<void> }
  private generation = 0
  private indexedAssignments?: readonly Assignment[]
  private assignmentsByPosition = new Map<string, Assignment>()
  private indexedVolunteers?: readonly Volunteer[]
  private volunteersByMinistry = new Map<string, readonly Volunteer[]>()

  constructor(
    repository: AssignmentRepository,
    onBoardChanged: BoardChanged = () => undefined,
    idFactory: AssignmentIdFactory = createRequestId,
    now: () => number = Date.now,
  ) {
    this.repository = repository
    this.onBoardChanged = onBoardChanged
    this.idFactory = idFactory
    this.boardCache = new RequestCache({
      maxAgeMs: 15_000,
      maxEntries: 10,
      now,
    })
  }

  readonly subscribe = (listener: Listener) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  readonly getSnapshot = () => this.snapshot

  async load(eventId: string, force = false) {
    if (!force) {
      const cached = this.boardCache.read(eventId)
      if (cached.hit) {
        this.applyBoard(cached.value, undefined, false)
        return
      }
      if (this.activeLoad?.eventId === eventId) {
        return this.activeLoad.promise
      }
    }

    const generation = ++this.generation
    this.setSnapshot({ status: 'loading', eventId })
    const promise = this.boardCache
      .getOrLoad(
        eventId,
        (signal) => this.repository.loadBoard(eventId, signal),
        force,
      )
      .then((board) => {
        if (generation === this.generation) this.applyBoard(board)
      })
      .catch((error: unknown) => {
        if (generation !== this.generation || isAbortError(error)) return
        this.setSnapshot({
          status: 'error',
          eventId,
          message: assignmentLoadMessage(error),
        })
      })
      .finally(() => {
        if (this.activeLoad?.promise === promise) this.activeLoad = undefined
      })
    this.activeLoad = { eventId, promise }
    return promise
  }

  retry() {
    if (this.snapshot.status === 'idle') return Promise.resolve()
    return this.load(this.snapshot.eventId, true)
  }

  assign(positionId: string, volunteerId: string): AssignmentValidation {
    if (this.snapshot.status !== 'ready') {
      return { valid: false, message: 'The assignment board is not loaded.' }
    }

    const validation = validateAssignment(
      positionId,
      volunteerId,
      this.snapshot,
    )
    if (!validation.valid) return validation

    const current = this.snapshot
    const volunteer = current.volunteers.find((item) => item.id === volunteerId)!
    const clientRequestId = this.idFactory()
    const pending: Assignment = {
      id: `pending-${clientRequestId}`,
      positionId,
      volunteerId,
      volunteerDisplayName: volunteer.displayName,
      status: 'accepted',
      syncStatus: 'pending',
      clientRequestId,
    }
    const generation = this.generation

    this.boardCache.invalidate(current.eventId)
    this.setSnapshot({
      ...current,
      assignments: [...current.assignments, pending],
      notice: undefined,
    })

    void this.repository
      .assign({
        eventId: current.eventId,
        positionId,
        volunteerId,
        expectedEventVersion: current.eventVersion,
        clientRequestId,
      })
      .then((result) => {
        if (generation !== this.generation || this.snapshot.status !== 'ready') {
          return
        }
        if (
          !this.snapshot.assignments.some(
            (item) => item.clientRequestId === clientRequestId,
          )
        ) {
          return
        }

        this.setSnapshot({
          ...this.snapshot,
          eventVersion: result.eventVersion,
          assignedPositions: result.assignedPositions,
          assignments: this.snapshot.assignments.map((item) =>
            item.clientRequestId === clientRequestId
              ? result.assignment
              : item,
          ),
          notice: {
            kind: 'success',
            message: `${volunteer.displayName} was assigned.`,
          },
        })
        this.cacheCurrentBoard()
        this.notifySchedule()
      })
      .catch((error: unknown) => {
        if (generation !== this.generation || this.snapshot.status !== 'ready') {
          return
        }

        if (error instanceof AssignmentConflictError) {
          this.generation++
          this.applyBoard(error.board, {
            kind: 'conflict',
            message: `${error.message} The latest assignments are shown.`,
          })
          return
        }

        this.setSnapshot({
          ...this.snapshot,
          assignments: this.snapshot.assignments.filter(
            (item) => item.clientRequestId !== clientRequestId,
          ),
          notice: {
            kind: 'error',
            message: assignmentSaveMessage(error),
          },
        })
      })

    return validation
  }

  assignmentFor(positionId: string): Assignment | undefined {
    if (this.snapshot.status !== 'ready') return undefined
    if (this.indexedAssignments !== this.snapshot.assignments) {
      this.indexedAssignments = this.snapshot.assignments
      this.assignmentsByPosition = new Map(
        this.snapshot.assignments
          .filter((assignment) => assignment.status !== 'declined')
          .map((assignment) => [assignment.positionId, assignment]),
      )
    }
    return this.assignmentsByPosition.get(positionId)
  }

  volunteersFor(position: MinistryPosition): readonly Volunteer[] {
    if (this.snapshot.status !== 'ready') return noVolunteers
    if (this.indexedVolunteers !== this.snapshot.volunteers) {
      this.indexedVolunteers = this.snapshot.volunteers
      const grouped = new Map<string, Volunteer[]>()
      for (const volunteer of this.snapshot.volunteers) {
        for (const ministry of volunteer.eligibleMinistries) {
          const eligible = grouped.get(ministry) ?? []
          eligible.push(volunteer)
          grouped.set(ministry, eligible)
        }
      }
      this.volunteersByMinistry = grouped
    }
    return this.volunteersByMinistry.get(position.ministry) ?? noVolunteers
  }

  dispose() {
    this.clear()
  }

  clear() {
    this.boardCache.clear()
    this.activeLoad = undefined
    this.generation++
    this.indexedAssignments = undefined
    this.assignmentsByPosition.clear()
    this.indexedVolunteers = undefined
    this.volunteersByMinistry.clear()
    this.setSnapshot(idleSnapshot)
  }

  private applyBoard(
    board: AssignmentBoard,
    notice?: AssignmentNotice,
    retain = true,
  ) {
    this.setSnapshot({ status: 'ready', ...board, notice })
    if (retain) this.boardCache.set(board.eventId, board)
    this.notifySchedule()
  }

  private cacheCurrentBoard() {
    if (
      this.snapshot.status !== 'ready' ||
      this.snapshot.assignments.some((item) => item.syncStatus === 'pending')
    ) {
      return
    }
    this.boardCache.set(this.snapshot.eventId, {
      eventId: this.snapshot.eventId,
      eventVersion: this.snapshot.eventVersion,
      assignedPositions: this.snapshot.assignedPositions,
      positions: this.snapshot.positions,
      volunteers: this.snapshot.volunteers,
      assignments: this.snapshot.assignments,
    })
  }

  private notifySchedule() {
    if (this.snapshot.status !== 'ready') return
    this.onBoardChanged(
      this.snapshot.eventId,
      this.snapshot.assignedPositions,
      this.snapshot.eventVersion,
    )
  }

  private setSnapshot(snapshot: AssignmentSnapshot) {
    this.snapshot = snapshot
    for (const listener of this.listeners) listener()
  }
}

function assignmentLoadMessage(error: unknown) {
  const problem = toAppProblem(error)
  switch (problem.kind) {
    case 'unauthenticated':
      return 'Your session expired. Sign in again, then reload assignments.'
    case 'forbidden':
      return 'Your account does not have permission to view assignments.'
    case 'unavailable':
      return 'The assignment service is temporarily unavailable. Try again.'
    default:
      return unexpectedProblemMessage(
        problem,
        'The assignment board could not be loaded. Try again.',
      )
  }
}

function assignmentSaveMessage(error: unknown) {
  const problem = toAppProblem(error)
  switch (problem.kind) {
    case 'unauthenticated':
      return 'Your session expired. The assignment was not saved.'
    case 'forbidden':
      return 'Your account does not have permission to assign volunteers.'
    case 'validation':
      return 'The assignment was rejected. Refresh the schedule and try again.'
    case 'unavailable':
      return 'The assignment was not saved because the service is unavailable. Try again.'
    default:
      return unexpectedProblemMessage(
        problem,
        'The assignment was not saved. Try again.',
      )
  }
}

export function validateAssignment(
  positionId: string,
  volunteerId: string,
  board: AssignmentBoard,
): AssignmentValidation {
  const position = board.positions.find((item) => item.id === positionId)
  if (!position) return { valid: false, message: 'Position was not found.' }

  const volunteer = board.volunteers.find((item) => item.id === volunteerId)
  if (!volunteer) return { valid: false, message: 'Volunteer was not found.' }

  if (!volunteer.eligibleMinistries.includes(position.ministry)) {
    return {
      valid: false,
      message: 'Volunteer is not eligible for this ministry.',
    }
  }

  const occupied = board.assignments.some(
    (item) => item.positionId === positionId && item.status !== 'declined',
  )
  return occupied
    ? { valid: false, message: 'Position already has an assignment.' }
    : { valid: true }
}
