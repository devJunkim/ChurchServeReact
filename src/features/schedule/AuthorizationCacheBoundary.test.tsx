import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { SessionContext } from '../../core/auth/sessionContext'
import type { CurrentUser } from '../../core/auth/session'
import { seededServiceEvents } from './seededServiceEvents'
import { ScheduleStore } from './scheduleStore'
import { ScheduleStoreProvider } from './ScheduleStoreProvider'
import { AssignmentStore } from './assignmentStore'
import { AssignmentStoreProvider } from './AssignmentStoreProvider'
import { AuthorizationCacheBoundary } from './AuthorizationCacheBoundary'
import { FakeAssignmentRepository } from '../../testing/FakeAssignmentRepository'

describe('AuthorizationCacheBoundary', () => {
  it('clears feature state when effective permissions change', async () => {
    const scheduleStore = new ScheduleStore({
      list: vi.fn().mockResolvedValue(seededServiceEvents),
      findById: vi.fn(),
      create: vi.fn(),
    })
    const assignmentStore = new AssignmentStore(new FakeAssignmentRepository())
    await scheduleStore.load()
    await assignmentStore.load('sunday-2026-11-01')
    const view = renderScope(scheduler, scheduleStore, assignmentStore)

    view.rerender(
      <Scope
        user={reader}
        scheduleStore={scheduleStore}
        assignmentStore={assignmentStore}
      />,
    )

    await waitFor(() => {
      expect(scheduleStore.getSnapshot()).toEqual({ status: 'idle' })
      expect(assignmentStore.getSnapshot()).toEqual({ status: 'idle' })
    })
  })
})

const scheduler: CurrentUser = {
  id: 'user-1',
  email: 'user@example.test',
  displayName: 'User',
  roles: ['scheduler'],
  permissions: [
    'schedule.read',
    'schedule.manage',
    'volunteer.read',
    'volunteer.manage',
  ],
}

const reader: CurrentUser = {
  ...scheduler,
  roles: ['reader'],
  permissions: ['schedule.read', 'volunteer.read'],
}

function renderScope(
  user: CurrentUser,
  scheduleStore: ScheduleStore,
  assignmentStore: AssignmentStore,
) {
  return render(
    <Scope
      user={user}
      scheduleStore={scheduleStore}
      assignmentStore={assignmentStore}
    />,
  )
}

function Scope({
  user,
  scheduleStore,
  assignmentStore,
}: {
  readonly user: CurrentUser
  readonly scheduleStore: ScheduleStore
  readonly assignmentStore: AssignmentStore
}) {
  const session = {
    state: { status: 'authenticated' as const, user },
    restore: async () => undefined,
    signIn: async () => undefined,
    signOut: async () => undefined,
  }

  return (
    <SessionContext value={session}>
      <ScheduleStoreProvider store={scheduleStore}>
        <AssignmentStoreProvider store={assignmentStore}>
          <AuthorizationCacheBoundary>
            <Content />
          </AuthorizationCacheBoundary>
        </AssignmentStoreProvider>
      </ScheduleStoreProvider>
    </SessionContext>
  )
}

function Content(): ReactNode {
  return null
}
