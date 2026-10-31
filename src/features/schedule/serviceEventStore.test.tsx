import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import type { ServiceEvent } from './serviceEvent'
import { useServiceEvents } from './serviceEventContext'
import { ServiceEventProvider } from './serviceEventStore'

describe('service event store', () => {
  it('finds a seeded event by its stable ID', () => {
    const { result } = renderHook(() => useServiceEvents(), {
      wrapper: ServiceEventProvider,
    })

    expect(result.current.findById('sunday-2026-11-01')?.title).toBe(
      'Sunday Morning Service',
    )
  })

  it('creates an event without mutating the seeded collection', () => {
    const initialEvents: readonly ServiceEvent[] = [
      {
        id: 'event-1',
        title: 'Sunday Service',
        startsAt: '2026-11-01T10:00:00-05:00',
        endsAt: '2026-11-01T11:00:00-05:00',
        location: 'Main Sanctuary',
        requiredPositions: 4,
        assignedPositions: 2,
      },
    ]
    const originalEvents = [...initialEvents]
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ServiceEventProvider
        initialEvents={initialEvents}
        eventIdFactory={() => 'prayer-night'}
      >
        {children}
      </ServiceEventProvider>
    )
    const { result } = renderHook(() => useServiceEvents(), { wrapper })

    act(() => {
      result.current.create({
        title: 'Prayer Night',
        startsAt: '2026-11-06T19:00:00.000Z',
        endsAt: '2026-11-06T20:00:00.000Z',
        location: 'Chapel',
      })
    })

    expect(initialEvents).toEqual(originalEvents)
    expect(result.current.events).toHaveLength(2)
    expect(result.current.findById('prayer-night')).toEqual(
      expect.objectContaining({
        title: 'Prayer Night',
        requiredPositions: 0,
        assignedPositions: 0,
      }),
    )
  })
})
