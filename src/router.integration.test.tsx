import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { CurrentUser } from './features/auth/session'
import type { SessionClient } from './features/auth/sessionClient'
import { createAppRoutes } from './router'
import { FakeServiceEventRepository } from './testing/FakeServiceEventRepository'
import { buildServiceEvent } from './testing/serviceEventBuilder'

const currentUser: CurrentUser = {
  id: 'coordinator-1',
  email: 'coordinator@churchserve.local',
  displayName: 'Demo Coordinator',
  roles: ['scheduler'],
}

describe('routed schedule workflow', () => {
  it('shares confirmed events across list, detail, and creation routes', async () => {
    const user = userEvent.setup()
    const event = buildServiceEvent()
    const repository = new FakeServiceEventRepository([event])
    const sessionClient: SessionClient = {
      restore: vi.fn().mockResolvedValue(currentUser),
      signIn: vi.fn().mockResolvedValue(currentUser),
      signOut: vi.fn().mockResolvedValue(undefined),
    }
    const router = createMemoryRouter(
      createAppRoutes(repository, sessionClient),
      { initialEntries: ['/schedule'] },
    )
    render(<RouterProvider router={router} />)

    expect(
      await screen.findByRole('heading', { name: 'Upcoming services' }),
    ).toBeVisible()
    expect(
      await screen.findByRole('region', { name: 'Current schedule summary' }),
    ).toHaveTextContent('3 open positions')
    expect(repository.listSignals).toHaveLength(1)

    await user.click(
      screen.getByRole('link', { name: 'View Sunday Morning Service' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Sunday Morning Service' }),
    ).toBeVisible()
    expect(repository.findByIdCalls).toEqual([])

    await user.click(
      screen.getByRole('link', { name: /Back to schedule/ }),
    )
    expect(
      await screen.findByRole('heading', { name: 'Upcoming services' }),
    ).toBeVisible()
    expect(repository.listSignals).toHaveLength(1)

    await user.click(screen.getByRole('link', { name: 'Create service' }))
    await user.type(screen.getByLabelText('Service name'), 'Prayer Night')
    await user.type(screen.getByLabelText('Starts'), '2026-11-06T19:00')
    await user.type(screen.getByLabelText('Ends'), '2026-11-06T20:00')
    await user.type(screen.getByLabelText('Location'), 'Chapel')
    await user.click(screen.getByRole('button', { name: 'Add to schedule' }))

    expect(
      await screen.findByRole('heading', { name: 'Prayer Night' }),
    ).toBeVisible()
    expect(screen.getByText('Chapel')).toBeVisible()
    expect(repository.createCalls).toEqual([
      {
        title: 'Prayer Night',
        startsAt: new Date('2026-11-06T19:00').toISOString(),
        endsAt: new Date('2026-11-06T20:00').toISOString(),
        location: 'Chapel',
      },
    ])
    expect(repository.findByIdCalls).toEqual([])
    expect(router.state.location.pathname).toBe('/schedule/created-2')
  })
})
