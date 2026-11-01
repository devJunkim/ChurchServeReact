import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InMemoryServiceEventRepository } from './features/schedule/inMemoryServiceEventRepository'
import type { ServiceEventRepository } from './features/schedule/serviceEventRepository'
import type { CurrentUser } from './core/auth/session'
import type { SessionClient } from './core/auth/sessionClient'
import { createScheduleFeatureLoader } from './features/schedule/scheduleFeature'
import { FakeAssignmentRepository } from './testing/FakeAssignmentRepository'
import { createAppRoutes } from './router'

const currentUser: CurrentUser = {
  id: 'coordinator-1',
  email: 'coordinator@churchserve.local',
  displayName: 'Demo Coordinator',
  roles: ['scheduler'],
  permissions: [
    'schedule.read',
    'schedule.manage',
    'volunteer.read',
    'volunteer.manage',
  ],
}

function createAuthenticatedSessionClient(): SessionClient {
  return {
    restore: vi.fn().mockResolvedValue(currentUser),
    signIn: vi.fn().mockResolvedValue(currentUser),
    signOut: vi.fn().mockResolvedValue(undefined),
  }
}

function renderRoute(
  path = '/',
  sessionClient = createAuthenticatedSessionClient(),
  repository: ServiceEventRepository = new InMemoryServiceEventRepository(),
) {
  const router = createMemoryRouter(
    createAppRoutes({
      sessionClient,
      loadScheduleFeature: createScheduleFeatureLoader(
        repository,
        new FakeAssignmentRepository(),
      ),
    }),
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return router
}

afterEach(() => vi.restoreAllMocks())

describe('ChurchServe application shell', () => {
  it('hides unavailable actions and denies a reader the create deep link', async () => {
    const reader: CurrentUser = {
      ...currentUser,
      roles: ['reader'],
      permissions: ['schedule.read', 'volunteer.read'],
    }
    const sessionClient: SessionClient = {
      restore: vi.fn().mockResolvedValue(reader),
      signIn: vi.fn().mockResolvedValue(reader),
      signOut: vi.fn().mockResolvedValue(undefined),
    }

    const router = renderRoute('/schedule', sessionClient)

    expect(
      await screen.findByRole('heading', { name: 'Upcoming services' }),
    ).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Create service' })).not.toBeInTheDocument()

    await router.navigate('/schedule/new')
    expect(
      await screen.findByRole('heading', {
        name: 'This feature is not available to your account.',
      }),
    ).toBeVisible()
  })

  it('omits navigation that is not granted by the session', async () => {
    const scheduleOnly: CurrentUser = {
      ...currentUser,
      permissions: ['schedule.read'],
    }
    renderRoute('/', {
      restore: vi.fn().mockResolvedValue(scheduleOnly),
      signIn: vi.fn().mockResolvedValue(scheduleOnly),
      signOut: vi.fn().mockResolvedValue(undefined),
    })

    await screen.findByText('Demo Coordinator')
    expect(screen.getByRole('link', { name: 'Schedule' })).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Volunteers' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'View volunteers' })).not.toBeInTheDocument()
  })

  it('renders the authenticated navigation and home introduction', async () => {
    renderRoute()

    expect(screen.getByRole('link', { name: 'ChurchServe home' })).toBeVisible()
    expect(
      await screen.findByRole('navigation', { name: 'Primary navigation' }),
    ).toBeVisible()
    expect(screen.getByText('Demo Coordinator')).toBeVisible()
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Serve together with a schedule everyone can understand.',
      }),
    ).toBeVisible()
  })

  it('navigates to the schedule without replacing the application shell', async () => {
    const user = userEvent.setup()
    renderRoute()

    await user.click(
      await screen.findByRole('link', { name: 'View the schedule' }),
    )

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Upcoming services',
      }),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'ChurchServe home' })).toBeVisible()
  })

  it('provides a recovery link for unknown routes', async () => {
    renderRoute('/missing')

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'This ChurchServe page does not exist.',
      }),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Return home' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('navigates from a schedule card to its parameterized detail route', async () => {
    const user = userEvent.setup()
    const repository = new InMemoryServiceEventRepository()
    const findById = vi.spyOn(repository, 'findById')
    const router = renderRoute(
      '/schedule',
      createAuthenticatedSessionClient(),
      repository,
    )

    await user.click(
      await screen.findByRole('link', { name: 'View Sunday Morning Service' }),
    )

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Sunday Morning Service',
      }),
    ).toBeVisible()
    expect(router.state.location.pathname).toBe(
      '/schedule/sunday-2026-11-01',
    )
    expect(findById).not.toHaveBeenCalled()
  })

  it('clears schedule state after leaving the feature route', async () => {
    const user = userEvent.setup()
    const repository = new InMemoryServiceEventRepository()
    const list = vi.spyOn(repository, 'list')
    renderRoute('/schedule', createAuthenticatedSessionClient(), repository)

    await screen.findAllByRole('article')
    await user.click(screen.getByRole('link', { name: 'Volunteers' }))
    await screen.findByRole('heading', {
      name: 'Volunteer tools are on the way',
    })
    await user.click(screen.getByRole('link', { name: 'Schedule' }))

    expect(await screen.findAllByRole('article')).toHaveLength(2)
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('opens the dedicated service creation route', async () => {
    renderRoute('/schedule/new')

    expect(
      await screen.findByRole('heading', { name: 'Create a service event' }),
    ).toBeVisible()
  })

  it('shows a record-specific state for an unknown event ID', async () => {
    renderRoute('/schedule/missing')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Service not found',
    )
    expect(
      screen.getByRole('link', { name: 'Return to the schedule' }),
    ).toHaveAttribute('href', '/schedule')
  })

  it('creates an event and navigates to its detail URL', async () => {
    const user = userEvent.setup()
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000006',
    )
    const router = renderRoute('/schedule/new')

    await screen.findByRole('heading', { name: 'Create a service event' })

    await user.type(screen.getByLabelText('Service name'), '  Prayer Night  ')
    await user.type(screen.getByLabelText('Starts'), '2026-11-06T19:00')
    await user.type(screen.getByLabelText('Ends'), '2026-11-06T20:00')
    await user.type(screen.getByLabelText('Location'), '  Chapel  ')
    await user.click(screen.getByRole('button', { name: 'Add to schedule' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Prayer Night' }),
    ).toBeVisible()
    expect(screen.getByText('Chapel')).toBeVisible()
    expect(router.state.location.pathname).toBe(
      '/schedule/00000000-0000-4000-8000-000000000006',
    )
  })

  it('signs in from the anonymous session and opens the schedule', async () => {
    const user = userEvent.setup()
    const sessionClient: SessionClient = {
      restore: vi.fn().mockResolvedValue(undefined),
      signIn: vi.fn().mockResolvedValue(currentUser),
      signOut: vi.fn().mockResolvedValue(undefined),
    }
    const router = renderRoute('/sign-in', sessionClient)

    await user.type(await screen.findByLabelText('Password'), 'local-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(sessionClient.signIn).toHaveBeenCalledWith({
      email: 'coordinator@churchserve.local',
      password: 'local-password',
    })
    expect(
      await screen.findByRole('heading', { name: 'Upcoming services' }),
    ).toBeVisible()
    expect(router.state.location.pathname).toBe('/schedule')
  })

  it('returns an anonymous user to the protected deep link after sign-in', async () => {
    const user = userEvent.setup()
    const sessionClient: SessionClient = {
      restore: vi.fn().mockResolvedValue(undefined),
      signIn: vi.fn().mockResolvedValue(currentUser),
      signOut: vi.fn().mockResolvedValue(undefined),
    }
    const router = renderRoute(
      '/schedule/sunday-2026-11-01',
      sessionClient,
    )

    await screen.findByRole('heading', {
      name: 'Sign in to coordinate ChurchServe',
    })
    expect(
      `${router.state.location.pathname}${router.state.location.search}`,
    ).toBe('/sign-in?returnTo=%2Fschedule%2Fsunday-2026-11-01')

    await user.type(screen.getByLabelText('Password'), 'local-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Sunday Morning Service',
      }),
    ).toBeVisible()
    expect(router.state.location.pathname).toBe(
      '/schedule/sunday-2026-11-01',
    )
  })

  it('falls back to the schedule for an unsafe return target', async () => {
    const user = userEvent.setup()
    const sessionClient: SessionClient = {
      restore: vi.fn().mockResolvedValue(undefined),
      signIn: vi.fn().mockResolvedValue(currentUser),
      signOut: vi.fn().mockResolvedValue(undefined),
    }
    const router = renderRoute(
      '/sign-in?returnTo=%2F%2Fevil.example',
      sessionClient,
    )

    await user.type(await screen.findByLabelText('Password'), 'local-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(
      await screen.findByRole('heading', { name: 'Upcoming services' }),
    ).toBeVisible()
    expect(router.state.location.pathname).toBe('/schedule')
  })

  it('distinguishes an unavailable session from a signed-out session', async () => {
    const user = userEvent.setup()
    const sessionClient: SessionClient = {
      restore: vi
        .fn<SessionClient['restore']>()
        .mockRejectedValueOnce(new Error('Unavailable'))
        .mockResolvedValueOnce(currentUser),
      signIn: vi.fn().mockResolvedValue(currentUser),
      signOut: vi.fn().mockResolvedValue(undefined),
    }
    renderRoute('/', sessionClient)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not verify your session',
    )
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(
      await screen.findByRole('heading', {
        name: 'Serve together with a schedule everyone can understand.',
      }),
    ).toBeVisible()
  })

  it('keeps the authenticated UI honest when sign-out fails', async () => {
    const user = userEvent.setup()
    const sessionClient: SessionClient = {
      restore: vi.fn().mockResolvedValue(currentUser),
      signIn: vi.fn().mockResolvedValue(currentUser),
      signOut: vi.fn().mockRejectedValue(new Error('Unavailable')),
    }
    renderRoute('/', sessionClient)

    await user.click(await screen.findByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ChurchServe could not sign you out.',
    )
    expect(screen.getByText('Demo Coordinator')).toBeVisible()
  })
})
