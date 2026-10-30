import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ServiceEventCard } from './ServiceEventCard'
import type { ServiceEvent } from './serviceEvent'

const event: ServiceEvent = {
  id: 'event-1',
  title: 'Sunday Morning Service',
  startsAt: '2026-11-01T10:00:00-05:00',
  endsAt: '2026-11-01T11:30:00-05:00',
  location: 'Main Sanctuary',
  requiredPositions: 10,
  assignedPositions: 7,
}

describe('ServiceEventCard', () => {
  it('renders the event and open-position count', () => {
    render(<ServiceEventCard event={event} onSelect={() => undefined} />)

    expect(
      screen.getByRole('heading', { name: 'Sunday Morning Service' }),
    ).toBeVisible()
    expect(screen.getByText('Main Sanctuary')).toBeVisible()
    expect(screen.getByText('3 open positions')).toBeVisible()
  })

  it('reports the event ID when selected', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<ServiceEventCard event={event} onSelect={onSelect} />)

    await user.click(
      screen.getByRole('button', { name: 'View Sunday Morning Service' }),
    )

    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect).toHaveBeenCalledWith('event-1')
  })

  it('shows when an event is fully staffed', () => {
    render(
      <ServiceEventCard
        event={{ ...event, assignedPositions: event.requiredPositions }}
        onSelect={() => undefined}
      />,
    )

    expect(screen.getByText('Fully staffed')).toBeVisible()
    expect(screen.queryByText(/open positions/)).not.toBeInTheDocument()
  })
})
