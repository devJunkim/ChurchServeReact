import type {
  AssignmentBoard,
  AssignVolunteerCommand,
  AssignVolunteerResult,
} from './assignment'

export interface AssignmentRepository {
  loadBoard(eventId: string, signal?: AbortSignal): Promise<AssignmentBoard>
  assign(
    command: AssignVolunteerCommand,
    signal?: AbortSignal,
  ): Promise<AssignVolunteerResult>
}

export class AssignmentConflictError extends Error {
  readonly board: AssignmentBoard

  constructor(message: string, board: AssignmentBoard) {
    super(message)
    this.name = 'AssignmentConflictError'
    this.board = board
  }
}
