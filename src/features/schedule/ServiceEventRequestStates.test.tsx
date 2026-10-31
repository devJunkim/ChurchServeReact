import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ServiceEventCreatePage } from './ServiceEventCreatePage'
import { ServiceEventDetailErrorPage } from './ServiceEventDetailErrorPage'
import {
  ServiceEventDetailLoadingPage,
  ServiceEventDetailPage,
} from './ServiceEventDetailPage'
import { ScheduleStoreProvider } from './ScheduleStoreProvider'
import { ScheduleStore } from './scheduleStore'
import { createServiceEventDetailLoader } from './serviceEventDetailLoader'
import type { ServiceEventRepository } from './serviceEventRepository'
import { seededServiceEvents } from './seededServiceEvents'

describe('service event request states', () => {
  it('retries a failed detail loader', async () => {
    const user = userEvent.setup()
    const findById = vi
      .fn<ServiceEventRepository['findById']>()
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValueOnce(seededServiceEvents[0])
    const repository = createRepository({ findById })

    renderRoute('/schedule/sunday-2026-11-01', repository)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The scheduling service did not respond.',
    )

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(
      await screen.findByRole('heading', { name: 'Sunday Morning Service' }),
    ).toBeVisible()
    expect(findById).toHaveBeenCalledTimes(2)
  })

  it('aborts an obsolete detail loader during navigation', async () => {
    let requestSignal: AbortSignal | undefined
    const repository = createRepository({
      findById: (_eventId, signal) => {
        requestSignal = signal
        return new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(signal.reason), {
            once: true,
          })
        })
      },
    })
    const { router } = renderRoute(
      '/schedule/sunday-2026-11-01',
      repository,
    )

    await waitFor(() => expect(requestSignal).toBeDefined())
    await router.navigate('/other')

    expect(requestSignal?.aborted).toBe(true)
    expect(
      await screen.findByRole('heading', { name: 'Other route' }),
    ).toBeVisible()
  })

  it('preserves entered values when creation fails', async () => {
    const user = userEvent.setup()
    const repository = createRepository({
      create: vi.fn().mockRejectedValue(new Error('Unavailable')),
    })
    renderRoute('/schedule/new', repository)

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Add to schedule' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not create the service event.',
    )
    expect(screen.getByLabelText('Service name')).toHaveValue('Prayer Night')
  })

  it('lets the user keep editing or discard a dirty form', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/schedule/new', createRepository())

    await user.type(screen.getByLabelText('Service name'), 'Prayer Night')
    void router.navigate('/other')

    expect(await screen.findByRole('alertdialog')).toHaveTextContent(
      'Your unsaved entries will be lost',
    )
    expect(router.state.location.pathname).toBe('/schedule/new')

    await user.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Service name')).toHaveValue('Prayer Night')

    void router.navigate('/other')
    await user.click(
      await screen.findByRole('button', { name: 'Discard and leave' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Other route' }),
    ).toBeVisible()
    expect(router.state.location.pathname).toBe('/other')
  })
})

function createRepository(
  overrides: Partial<ServiceEventRepository> = {},
): ServiceEventRepository {
  return {
    list: async () => seededServiceEvents,
    findById: async () => undefined,
    create: async () => {
      throw new Error('Not configured for this test.')
    },
    ...overrides,
  }
}

function renderRoute(path: string, repository: ServiceEventRepository) {
  const store = new ScheduleStore(repository)
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <ScheduleStoreProvider store={store}>
            <Outlet />
          </ScheduleStoreProvider>
        ),
        children: [
          {
            path: 'schedule/:eventId',
            loader: createServiceEventDetailLoader(store),
            Component: ServiceEventDetailPage,
            HydrateFallback: ServiceEventDetailLoadingPage,
            ErrorBoundary: ServiceEventDetailErrorPage,
          },
          {
            path: 'schedule/new',
            Component: ServiceEventCreatePage,
          },
          {
            path: 'other',
            element: <h1>Other route</h1>,
          },
        ],
      },
    ],
    { initialEntries: [path] },
  )

  return { router, view: render(<RouterProvider router={router} />) }
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Service name'), 'Prayer Night')
  await user.type(screen.getByLabelText('Starts'), '2026-11-06T19:00')
  await user.type(screen.getByLabelText('Ends'), '2026-11-06T20:00')
  await user.type(screen.getByLabelText('Location'), 'Chapel')
}
