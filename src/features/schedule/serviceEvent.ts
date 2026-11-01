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

export function equalServiceEvent(
  left: ServiceEvent,
  right: ServiceEvent,
) {
  return (
    left.id === right.id &&
    left.title === right.title &&
    left.startsAt === right.startsAt &&
    left.endsAt === right.endsAt &&
    left.location === right.location &&
    left.requiredPositions === right.requiredPositions &&
    left.assignedPositions === right.assignedPositions &&
    left.version === right.version
  )
}
