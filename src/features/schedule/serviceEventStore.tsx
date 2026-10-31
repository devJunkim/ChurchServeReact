import { useState, type ReactNode } from 'react'
import type { CreateServiceEventCommand } from './createServiceEvent'
import type { ServiceEvent } from './serviceEvent'
import { ServiceEventContext } from './serviceEventContext'

const seededServiceEvents: readonly ServiceEvent[] = [
  {
    id: 'sunday-2026-11-01',
    title: 'Sunday Morning Service',
    startsAt: '2026-11-01T10:00:00-05:00',
    endsAt: '2026-11-01T11:30:00-05:00',
    location: 'Main Sanctuary',
    requiredPositions: 10,
    assignedPositions: 7,
  },
  {
    id: 'rehearsal-2026-11-05',
    title: 'Worship Team Rehearsal',
    startsAt: '2026-11-05T19:00:00-05:00',
    endsAt: '2026-11-05T20:30:00-05:00',
    location: 'Music Room',
    requiredPositions: 6,
    assignedPositions: 6,
  },
]

type ServiceEventProviderProps = {
  children: ReactNode
  initialEvents?: readonly ServiceEvent[]
  eventIdFactory?: () => string
}

const createEventId = () => crypto.randomUUID()

export function ServiceEventProvider({
  children,
  initialEvents = seededServiceEvents,
  eventIdFactory = createEventId,
}: ServiceEventProviderProps) {
  const [events, setEvents] = useState<readonly ServiceEvent[]>(() => [
    ...initialEvents,
  ])

  function findById(eventId: string) {
    return events.find((event) => event.id === eventId)
  }

  function create(command: CreateServiceEventCommand) {
    const event: ServiceEvent = {
      id: eventIdFactory(),
      ...command,
      requiredPositions: 0,
      assignedPositions: 0,
    }

    setEvents((current) => [...current, event])
    return event
  }

  return (
    <ServiceEventContext value={{ events, findById, create }}>
      {children}
    </ServiceEventContext>
  )
}
