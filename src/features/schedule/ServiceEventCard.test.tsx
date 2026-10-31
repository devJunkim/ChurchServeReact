import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
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

function renderCard(eventValue = event) {
  render(
    <MemoryRouter>
      <ServiceEventCard event={eventValue} />
    </MemoryRouter>,
  )
}

describe('ServiceEventCard', () => {
  it('renders the event and open-position count', () => {
    renderCard()

    expect(
      screen.getByRole('heading', { name: 'Sunday Morning Service' }),
    ).toBeVisible()
    expect(screen.getByText('Main Sanctuary')).toBeVisible()
    expect(screen.getByText('3 open positions')).toBeVisible()
  })

  it('links to the event detail route', () => {
    renderCard()

    expect(
      screen.getByRole('link', { name: 'View Sunday Morning Service' }),
    ).toHaveAttribute('href', '/schedule/event-1')
  })

  it('shows when an event is fully staffed', () => {
    renderCard({ ...event, assignedPositions: event.requiredPositions })

    expect(screen.getByText('Fully staffed')).toBeVisible()
    expect(screen.queryByText(/open positions/)).not.toBeInTheDocument()
  })
})
