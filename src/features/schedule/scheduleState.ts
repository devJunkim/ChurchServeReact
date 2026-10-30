import type { ServiceEvent } from './serviceEvent'

export type ScheduleState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; events: readonly ServiceEvent[] }
