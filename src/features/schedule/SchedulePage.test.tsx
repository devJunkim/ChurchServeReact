import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SchedulePage } from './SchedulePage'

describe('SchedulePage', () => {
  it('renders the event collection and owns card selection', async () => {
    const user = userEvent.setup()
    render(<SchedulePage />)

    expect(screen.getAllByRole('article')).toHaveLength(2)

    await user.click(
      screen.getByRole('button', { name: 'View Sunday Morning Service' }),
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'Sunday Morning Service selected',
    )
  })

  it('shows a loading message without rendering an empty state', () => {
    render(<SchedulePage initialState={{ status: 'loading' }} />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading the service schedule',
    )
    expect(screen.queryByText('No upcoming services')).not.toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('shows an error and reloads the seeded schedule', async () => {
    const user = userEvent.setup()
    render(
      <SchedulePage
        initialState={{
          status: 'error',
          message: 'The scheduling service did not respond.',
        }}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The scheduling service did not respond.',
    )

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(2)
  })

  it('shows an empty state only after an empty schedule is ready', () => {
    render(<SchedulePage initialState={{ status: 'ready', events: [] }} />)

    expect(
      screen.getByRole('heading', { name: 'No upcoming services' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('adds a valid service event to the in-memory schedule', async () => {
    const user = userEvent.setup()
    render(<SchedulePage eventIdFactory={() => 'prayer-night'} />)

    await user.type(screen.getByLabelText('Service name'), '  Prayer Night  ')
    await user.type(screen.getByLabelText('Starts'), '2026-11-06T19:00')
    await user.type(screen.getByLabelText('Ends'), '2026-11-06T20:00')
    await user.type(screen.getByLabelText('Location'), '  Chapel  ')
    await user.click(screen.getByRole('button', { name: 'Add to schedule' }))

    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(
      screen.getByRole('heading', { name: 'Prayer Night' }),
    ).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Prayer Night was added to the schedule.',
    )
  })
})
