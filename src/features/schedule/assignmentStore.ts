import type {
  Assignment,
  AssignmentBoard,
  MinistryPosition,
  Volunteer,
} from './assignment'
import {
  AssignmentConflictError,
  type AssignmentRepository,
} from './assignmentRepository'
import { isAbortError } from './requestError'

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

export class AssignmentStore {
  private readonly repository: AssignmentRepository
  private readonly onBoardChanged: BoardChanged
  private readonly idFactory: AssignmentIdFactory
  private snapshot: AssignmentSnapshot = idleSnapshot
  private readonly listeners = new Set<Listener>()
  private activeLoad?: AbortController
  private generation = 0

  constructor(
    repository: AssignmentRepository,
    onBoardChanged: BoardChanged = () => undefined,
    idFactory: AssignmentIdFactory = createRequestId,
  ) {
    this.repository = repository
    this.onBoardChanged = onBoardChanged
    this.idFactory = idFactory
  }

  readonly subscribe = (listener: Listener) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  readonly getSnapshot = () => this.snapshot

  async load(eventId: string, force = false) {
    if (
      !force &&
      this.snapshot.status === 'ready' &&
      this.snapshot.eventId === eventId
    ) {
      return
    }

    this.activeLoad?.abort()
    const controller = new AbortController()
    const generation = ++this.generation
    this.activeLoad = controller
    this.setSnapshot({ status: 'loading', eventId })

    try {
      const board = await this.repository.loadBoard(eventId, controller.signal)
      if (controller.signal.aborted || generation !== this.generation) return
      this.applyBoard(board)
    } catch (error) {
      if (
        controller.signal.aborted ||
        generation !== this.generation ||
        isAbortError(error)
      ) {
        return
      }
      this.setSnapshot({
        status: 'error',
        eventId,
        message: 'The assignment board did not load. Try again.',
      })
    } finally {
      if (this.activeLoad === controller) this.activeLoad = undefined
    }
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
            message: 'The assignment was not saved. Try again.',
          },
        })
      })

    return validation
  }

  volunteersFor(position: MinistryPosition): readonly Volunteer[] {
    if (this.snapshot.status !== 'ready') return []
    return this.snapshot.volunteers.filter((volunteer) =>
      volunteer.eligibleMinistries.includes(position.ministry),
    )
  }

  dispose() {
    this.activeLoad?.abort()
    this.activeLoad = undefined
    this.generation++
    this.setSnapshot(idleSnapshot)
  }

  private applyBoard(board: AssignmentBoard, notice?: AssignmentNotice) {
    this.setSnapshot({ status: 'ready', ...board, notice })
    this.notifySchedule()
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
