import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { SchedulePage } from './SchedulePage'
import { InMemoryServiceEventRepository } from './inMemoryServiceEventRepository'
import { ServiceEventProvider } from './ServiceEventProvider'

function renderSchedule(
  initialState?: ComponentProps<typeof SchedulePage>['initialState'],
) {
  const repository = new InMemoryServiceEventRepository()
  render(
    <MemoryRouter>
      <ServiceEventProvider repository={repository}>
        <SchedulePage initialState={initialState} />
      </ServiceEventProvider>
    </MemoryRouter>,
  )
}

describe('SchedulePage', () => {
  it('renders the event collection with detail links', () => {
    renderSchedule()

    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(
      screen.getByRole('link', { name: 'View Sunday Morning Service' }),
    ).toHaveAttribute('href', '/schedule/sunday-2026-11-01')
  })

  it('shows a loading message without rendering an empty state', () => {
    renderSchedule({ status: 'loading' })

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading the service schedule',
    )
    expect(screen.queryByText('No upcoming services')).not.toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('shows an error and reloads the seeded schedule', async () => {
    const user = userEvent.setup()
    renderSchedule({
      status: 'error',
      message: 'The scheduling service did not respond.',
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The scheduling service did not respond.',
    )

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(2)
  })

  it('shows an empty state only after an empty schedule is ready', () => {
    renderSchedule({ status: 'ready', events: [] })

    expect(
      screen.getByRole('heading', { name: 'No upcoming services' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('links to the dedicated creation route', () => {
    renderSchedule()

    expect(screen.getByRole('link', { name: 'Create service' })).toHaveAttribute(
      'href',
      '/schedule/new',
    )
  })
})
