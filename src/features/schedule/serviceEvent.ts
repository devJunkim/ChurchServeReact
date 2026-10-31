export type ServiceEvent = {
  readonly id: string
  readonly title: string
  readonly startsAt: string
  readonly endsAt: string
  readonly location: string
  readonly requiredPositions: number
  readonly assignedPositions: number
  readonly version: number
}
