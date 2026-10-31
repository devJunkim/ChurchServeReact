import type {
  AssignmentBoard,
  AssignVolunteerCommand,
  AssignVolunteerResult,
} from '../features/schedule/assignment'
import type { AssignmentRepository } from '../features/schedule/assignmentRepository'

export class FakeAssignmentRepository implements AssignmentRepository {
  readonly loadCalls: string[] = []
  readonly assignCalls: AssignVolunteerCommand[] = []
  private readonly boards = new Map<string, AssignmentBoard>()

  constructor(boards: readonly AssignmentBoard[] = []) {
    for (const board of boards) this.boards.set(board.eventId, board)
  }

  readonly loadBoard = async (eventId: string, signal?: AbortSignal) => {
    this.loadCalls.push(eventId)
    signal?.throwIfAborted()
    return this.boards.get(eventId) ?? emptyAssignmentBoard(eventId)
  }

  readonly assign = async (
    command: AssignVolunteerCommand,
    signal?: AbortSignal,
  ): Promise<AssignVolunteerResult> => {
    this.assignCalls.push(command)
    signal?.throwIfAborted()
    throw new Error('No assignment response was configured.')
  }
}

export function emptyAssignmentBoard(eventId: string): AssignmentBoard {
  return {
    eventId,
    eventVersion: 1,
    assignedPositions:
      eventId === 'sunday-2026-11-01'
        ? 7
        : eventId === 'rehearsal-2026-11-05'
          ? 4
          : 0,
    positions: [],
    volunteers: [],
    assignments: [],
  }
}
