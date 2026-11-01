import { Outlet } from 'react-router'
import type {
  ScheduleFeature,
  ScheduleFeatureLoader,
} from '../../shared/routing/lazyFeature'
import { HttpServiceEventRepository } from './httpServiceEventRepository'
import { AssignmentStore } from './assignmentStore'
import { AssignmentStoreProvider } from './AssignmentStoreProvider'
import type { AssignmentRepository } from './assignmentRepository'
import { HttpAssignmentRepository } from './httpAssignmentRepository'
import { SchedulePage } from './SchedulePage'
import { ScheduleStoreProvider } from './ScheduleStoreProvider'
import { ServiceEventCreatePage } from './ServiceEventCreatePage'
import { ServiceEventDetailErrorPage } from './ServiceEventDetailErrorPage'
import { ServiceEventDetailPage } from './ServiceEventDetailPage'
import { createServiceEventDetailLoader } from './serviceEventDetailLoader'
import type { ServiceEventRepository } from './serviceEventRepository'
import { ScheduleStore } from './scheduleStore'
import { AuthorizationCacheBoundary } from './AuthorizationCacheBoundary'

export function createScheduleFeature(
  repository: ServiceEventRepository = new HttpServiceEventRepository(),
  assignmentRepository: AssignmentRepository = new HttpAssignmentRepository(),
): ScheduleFeature {
  const store = new ScheduleStore(repository)
  const assignmentStore = new AssignmentStore(
    assignmentRepository,
    (eventId, assignedPositions, version) =>
      store.updateStaffing(eventId, assignedPositions, version),
  )

  function ScheduleFeatureLayout() {
    return (
      <ScheduleStoreProvider store={store}>
        <AssignmentStoreProvider store={assignmentStore}>
          <AuthorizationCacheBoundary>
            <Outlet />
          </AuthorizationCacheBoundary>
        </AssignmentStoreProvider>
      </ScheduleStoreProvider>
    )
  }

  return {
    Layout: ScheduleFeatureLayout,
    list: { Component: SchedulePage },
    create: { Component: ServiceEventCreatePage },
    detail: {
      Component: ServiceEventDetailPage,
      loader: createServiceEventDetailLoader(store),
      ErrorBoundary: ServiceEventDetailErrorPage,
    },
  }
}


export function createScheduleFeatureLoader(
  repository: ServiceEventRepository,
  assignmentRepository: AssignmentRepository,
): ScheduleFeatureLoader {
  return async () => createScheduleFeature(repository, assignmentRepository)
}
