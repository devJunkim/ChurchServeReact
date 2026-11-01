import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppErrorPage } from './AppErrorPage'

describe('AppErrorPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows a safe recovery page and logs only an error category', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const router = createMemoryRouter(
      [
        {
          path: '/',
          Component: BrokenPage,
          ErrorBoundary: AppErrorPage,
        },
      ],
      { initialEntries: ['/'] },
    )

    render(<RouterProvider router={router} />)

    expect(
      await screen.findByRole('heading', {
        name: 'ChurchServe could not open this page',
      }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Reload ChurchServe' })).toBeVisible()
    expect(error).toHaveBeenCalledWith('Unexpected application error.', 'Error')
    expect(error).not.toHaveBeenCalledWith(expect.stringContaining('private detail'))
  })
})

function BrokenPage(): never {
  throw new Error('private detail')
}
