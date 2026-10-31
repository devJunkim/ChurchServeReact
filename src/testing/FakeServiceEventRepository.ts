import type { CreateServiceEventCommand } from '../features/schedule/createServiceEvent'
import type { ServiceEvent } from '../features/schedule/serviceEvent'
import type { ServiceEventRepository } from '../features/schedule/serviceEventRepository'
import { buildServiceEvent } from './serviceEventBuilder'

export class FakeServiceEventRepository implements ServiceEventRepository {
  readonly listSignals: Array<AbortSignal | undefined> = []
  readonly findByIdCalls: string[] = []
  readonly createCalls: CreateServiceEventCommand[] = []

  private events: readonly ServiceEvent[]
  private listFailure?: unknown
  private findByIdFailure?: unknown
  private createFailure?: unknown

  constructor(events: readonly ServiceEvent[] = [buildServiceEvent()]) {
    this.events = [...events]
  }

  readonly list = async (signal?: AbortSignal) => {
    this.listSignals.push(signal)
    signal?.throwIfAborted()
    if (this.listFailure !== undefined) {
      throw this.listFailure
    }
    return this.events
  }

  readonly findById = async (eventId: string, signal?: AbortSignal) => {
    this.findByIdCalls.push(eventId)
    signal?.throwIfAborted()
    if (this.findByIdFailure !== undefined) {
      throw this.findByIdFailure
    }
    return this.events.find((event) => event.id === eventId)
  }

  readonly create = async (
    command: CreateServiceEventCommand,
    signal?: AbortSignal,
  ) => {
    this.createCalls.push(command)
    signal?.throwIfAborted()
    if (this.createFailure !== undefined) {
      throw this.createFailure
    }

    const event = buildServiceEvent({
      ...command,
      id: `created-${this.events.length + 1}`,
      requiredPositions: 0,
      assignedPositions: 0,
    })
    this.events = [...this.events, event]
    return event
  }

  failListWith(error: unknown) {
    this.listFailure = error
  }

  failFindByIdWith(error: unknown) {
    this.findByIdFailure = error
  }

  failCreateWith(error: unknown) {
    this.createFailure = error
  }
}
