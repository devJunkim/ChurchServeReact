import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { appRoutes } from './router'

function renderRoute(path = '/') {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
}

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
})
