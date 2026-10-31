import { Outlet } from 'react-router'
import type {
  ScheduleFeature,
  ScheduleFeatureLoader,
} from '../../shared/routing/lazyFeature'
import { HttpServiceEventRepository } from './httpServiceEventRepository'
import { SchedulePage } from './SchedulePage'
import { ScheduleStoreProvider } from './ScheduleStoreProvider'
import { ServiceEventCreatePage } from './ServiceEventCreatePage'
import { ServiceEventDetailErrorPage } from './ServiceEventDetailErrorPage'
import { ServiceEventDetailPage } from './ServiceEventDetailPage'
import { createServiceEventDetailLoader } from './serviceEventDetailLoader'
import type { ServiceEventRepository } from './serviceEventRepository'
import { ScheduleStore } from './scheduleStore'

export function createScheduleFeature(
  repository: ServiceEventRepository = new HttpServiceEventRepository(),
): ScheduleFeature {
  const store = new ScheduleStore(repository)

  function ScheduleFeatureLayout() {
    return (
      <ScheduleStoreProvider store={store}>
        <Outlet />
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
): ScheduleFeatureLoader {
  return async () => createScheduleFeature(repository)
}
