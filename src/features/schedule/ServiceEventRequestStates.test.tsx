import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ServiceEventCreatePage } from './ServiceEventCreatePage'
import { ServiceEventDetailPage } from './ServiceEventDetailPage'
import { ServiceEventProvider } from './ServiceEventProvider'
import type { ServiceEventRepository } from './serviceEventRepository'
import { seededServiceEvents } from './seededServiceEvents'

describe('service event request states', () => {
  it('retries a failed detail request', async () => {
    const user = userEvent.setup()
    const findById = vi
      .fn<ServiceEventRepository['findById']>()
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValueOnce(seededServiceEvents[0])
    const repository = createRepository({ findById })

    renderRoute(
      '/schedule/sunday-2026-11-01',
      <Route path="/schedule/:eventId" element={<ServiceEventDetailPage />} />,
      repository,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The scheduling service did not respond.',
    )

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(
      await screen.findByRole('heading', { name: 'Sunday Morning Service' }),
    ).toBeVisible()
    expect(findById).toHaveBeenCalledTimes(2)
  })

  it('aborts an obsolete detail request when the route unmounts', async () => {
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
    const view = renderRoute(
      '/schedule/sunday-2026-11-01',
      <Route path="/schedule/:eventId" element={<ServiceEventDetailPage />} />,
      repository,
    )

    await waitFor(() => expect(requestSignal).toBeDefined())
    view.unmount()

    expect(requestSignal?.aborted).toBe(true)
  })

  it('preserves entered values when creation fails', async () => {
    const user = userEvent.setup()
    const repository = createRepository({
      create: vi.fn().mockRejectedValue(new Error('Unavailable')),
    })
    renderRoute(
      '/schedule/new',
      <Route path="/schedule/new" element={<ServiceEventCreatePage />} />,
      repository,
    )

    await user.type(screen.getByLabelText('Service name'), 'Prayer Night')
    await user.type(screen.getByLabelText('Starts'), '2026-11-06T19:00')
    await user.type(screen.getByLabelText('Ends'), '2026-11-06T20:00')
    await user.type(screen.getByLabelText('Location'), 'Chapel')
    await user.click(screen.getByRole('button', { name: 'Add to schedule' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not create the service event.',
    )
    expect(screen.getByLabelText('Service name')).toHaveValue('Prayer Night')
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

function renderRoute(
  path: string,
  route: React.ReactNode,
  repository: ServiceEventRepository,
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ServiceEventProvider repository={repository}>
        <Routes>{route}</Routes>
      </ServiceEventProvider>
    </MemoryRouter>,
  )
}
