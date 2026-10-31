import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { SchedulePage } from './SchedulePage'
import { ScheduleStoreProvider } from './ScheduleStoreProvider'
import { InMemoryServiceEventRepository } from './inMemoryServiceEventRepository'
import { ScheduleStore } from './scheduleStore'
import type { ServiceEventRepository } from './serviceEventRepository'

function renderSchedule(
  repository: ServiceEventRepository = new InMemoryServiceEventRepository(),
) {
  const store = new ScheduleStore(repository)
  render(
    <MemoryRouter>
      <ScheduleStoreProvider store={store}>
        <SchedulePage />
      </ScheduleStoreProvider>
    </MemoryRouter>,
  )
}

describe('SchedulePage', () => {
  it('renders the event collection with detail links', async () => {
    renderSchedule()

    expect(await screen.findAllByRole('article')).toHaveLength(2)
    expect(
      screen.getByRole('link', { name: 'View Sunday Morning Service' }),
    ).toHaveAttribute('href', '/schedule/sunday-2026-11-01')
    expect(
      screen.getByRole('region', { name: 'Current schedule summary' }),
    ).toHaveTextContent('2 upcoming services')
    expect(
      screen.getByRole('region', { name: 'Current schedule summary' }),
    ).toHaveTextContent('5 open positions')
  })

  it('shows a loading message without rendering an empty state', () => {
    renderSchedule(repositoryWithList(() => new Promise(() => undefined)))

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading the service schedule',
    )
    expect(screen.queryByText('No upcoming services')).not.toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('shows an error and reloads the seeded schedule', async () => {
    const user = userEvent.setup()
    const seededRepository = new InMemoryServiceEventRepository()
    const list = vi
      .fn<ServiceEventRepository['list']>()
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockImplementation((signal) => seededRepository.list(signal))
    renderSchedule(repositoryWithList(list))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The scheduling service did not respond.',
    )

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(await screen.findAllByRole('article')).toHaveLength(2)
  })

  it('shows an empty state only after an empty schedule is ready', async () => {
    renderSchedule(repositoryWithList(async () => []))

    expect(
      await screen.findByRole('heading', { name: 'No upcoming services' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('links to the dedicated creation route', async () => {
    renderSchedule()

    expect(await screen.findByRole('link', { name: 'Create service' })).toHaveAttribute(
      'href',
      '/schedule/new',
    )
  })
})

function repositoryWithList(
  list: ServiceEventRepository['list'],
): ServiceEventRepository {
  return {
    list,
    findById: async () => undefined,
    create: async () => {
      throw new Error('Not used by this test.')
    },
  }
}
