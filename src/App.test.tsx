import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { appRoutes } from './router'

function renderRoute(path = '/') {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

afterEach(() => vi.restoreAllMocks())

describe('ChurchServe application shell', () => {
  it('renders the application name, primary navigation, and home introduction', () => {
    renderRoute()

    expect(screen.getByRole('link', { name: 'ChurchServe home' })).toBeVisible()
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()
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

    await user.click(screen.getByRole('link', { name: 'View the schedule' }))

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Upcoming services',
      }),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'ChurchServe home' })).toBeVisible()
  })

  it('provides a recovery link for unknown routes', () => {
    renderRoute('/missing')

    expect(
      screen.getByRole('heading', {
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
    const router = renderRoute('/schedule')

    await user.click(
      screen.getByRole('link', { name: 'View Sunday Morning Service' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Sunday Morning Service' }),
    ).toBeVisible()
    expect(router.state.location.pathname).toBe(
      '/schedule/sunday-2026-11-01',
    )
  })

  it('opens the dedicated service creation route', () => {
    renderRoute('/schedule/new')

    expect(
      screen.getByRole('heading', { name: 'Create a service event' }),
    ).toBeVisible()
  })

  it('shows a record-specific state for an unknown event ID', () => {
    renderRoute('/schedule/missing')

    expect(screen.getByRole('alert')).toHaveTextContent('Service not found')
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

    await user.type(screen.getByLabelText('Service name'), '  Prayer Night  ')
    await user.type(screen.getByLabelText('Starts'), '2026-11-06T19:00')
    await user.type(screen.getByLabelText('Ends'), '2026-11-06T20:00')
    await user.type(screen.getByLabelText('Location'), '  Chapel  ')
    await user.click(screen.getByRole('button', { name: 'Add to schedule' }))

    expect(
      await screen.findByRole('heading', { name: 'Prayer Night' }),
    ).toBeVisible()
    expect(screen.getByText('Chapel')).toBeVisible()
    expect(router.state.location.pathname).toBe(
      '/schedule/00000000-0000-4000-8000-000000000006',
    )
  })
})
