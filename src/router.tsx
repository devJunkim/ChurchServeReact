import { createBrowserRouter, Outlet, type RouteObject } from 'react-router'
import { App } from './App'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { SchedulePage } from './features/schedule/SchedulePage'
import { ServiceEventCreatePage } from './features/schedule/ServiceEventCreatePage'
import {
  ServiceEventDetailLoadingPage,
  ServiceEventDetailPage,
} from './features/schedule/ServiceEventDetailPage'
import { HttpServiceEventRepository } from './features/schedule/httpServiceEventRepository'
import type { ServiceEventRepository } from './features/schedule/serviceEventRepository'
import { HttpSessionClient } from './features/auth/httpSessionClient'
import type { SessionClient } from './features/auth/sessionClient'
import { SignInPage } from './features/auth/SignInPage'
import { RequireAuthenticatedSession } from './features/auth/RequireAuthenticatedSession'
import { createServiceEventDetailLoader } from './features/schedule/serviceEventDetailLoader'
import { ServiceEventDetailErrorPage } from './features/schedule/ServiceEventDetailErrorPage'
import { ScheduleStore } from './features/schedule/scheduleStore'
import { ScheduleStoreProvider } from './features/schedule/ScheduleStoreProvider'

export function createAppRoutes(
  repository: ServiceEventRepository,
  sessionClient: SessionClient,
): RouteObject[] {
  const scheduleStore = new ScheduleStore(repository)

  return [
    {
      path: '/',
      element: <App sessionClient={sessionClient} />,
      children: [
        { index: true, Component: HomePage },
        { path: 'sign-in', Component: SignInPage },
        {
          Component: RequireAuthenticatedSession,
          children: [
            {
              element: (
                <ScheduleStoreProvider store={scheduleStore}>
                  <Outlet />
                </ScheduleStoreProvider>
              ),
              children: [
                {
                  path: 'schedule',
                  Component: SchedulePage,
                },
                {
                  path: 'schedule/new',
                  Component: ServiceEventCreatePage,
                },
                {
                  path: 'schedule/:eventId',
                  loader: createServiceEventDetailLoader(scheduleStore),
                  Component: ServiceEventDetailPage,
                  HydrateFallback: ServiceEventDetailLoadingPage,
                  ErrorBoundary: ServiceEventDetailErrorPage,
                },
              ],
            },
            {
              path: 'volunteers',
              element: (
                <PlaceholderPage
                  eyebrow="Volunteers"
                  title="Volunteer tools are on the way"
                >
                  Later parts will model availability, ministry eligibility,
                  search, and assignments without changing this application
                  shell.
                </PlaceholderPage>
              ),
            },
          ],
        },
        { path: '*', Component: NotFoundPage },
      ],
    },
  ]
}

export function createAppRouter() {
  return createBrowserRouter(
    createAppRoutes(
      new HttpServiceEventRepository(),
      new HttpSessionClient(),
    ),
  )
}
