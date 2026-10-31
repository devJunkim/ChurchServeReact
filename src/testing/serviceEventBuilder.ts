import type { ServiceEvent } from '../features/schedule/serviceEvent'

export function buildServiceEvent(
  overrides: Partial<ServiceEvent> = {},
): ServiceEvent {
  return {
    id: 'sunday-2026-11-01',
    title: 'Sunday Morning Service',
    startsAt: '2026-11-01T10:00:00-05:00',
    endsAt: '2026-11-01T11:30:00-05:00',
    location: 'Main Sanctuary',
    requiredPositions: 10,
    assignedPositions: 7,
    ...overrides,
  }
}
