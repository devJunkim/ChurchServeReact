import { createBrowserRouter, type RouteObject } from 'react-router'
import { App } from './App'
import { HttpSessionClient } from './core/auth/httpSessionClient'
import { RequireAuthenticatedSession } from './core/auth/RequireAuthenticatedSession'
import type { SessionClient } from './core/auth/sessionClient'
import { SignInPage } from './core/auth/SignInPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import type {
  ScheduleFeatureLoader,
  VolunteerFeatureLoader,
} from './shared/routing/lazyFeature'
import { RouteLoadingPage } from './shared/ui/RouteLoadingPage'

type AppRouteDependencies = {
  sessionClient: SessionClient
  loadScheduleFeature?: ScheduleFeatureLoader
  loadVolunteerFeature?: VolunteerFeatureLoader
}

const loadProductionScheduleFeature: ScheduleFeatureLoader = async () => {
  const feature = await import('./features/schedule/scheduleFeature')
  return feature.createScheduleFeature()
}

const loadProductionVolunteerFeature: VolunteerFeatureLoader = async () => {
  const feature = await import('./features/volunteers/volunteerFeature')
  return feature.volunteerFeature
}

function loadOnce<T>(loader: () => Promise<T>) {
  let pending: Promise<T> | undefined
  return () => (pending ??= loader())
}

export function createAppRoutes({
  sessionClient,
  loadScheduleFeature = loadProductionScheduleFeature,
  loadVolunteerFeature = loadProductionVolunteerFeature,
}: AppRouteDependencies): RouteObject[] {
  const schedule = loadOnce(loadScheduleFeature)
  const volunteers = loadOnce(loadVolunteerFeature)

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
              lazy: async () => ({ Component: (await schedule()).Layout }),
              HydrateFallback: RouteLoadingPage,
              children: [
                {
                  path: 'schedule',
                  lazy: async () => (await schedule()).list,
                  HydrateFallback: RouteLoadingPage,
                },
                {
                  path: 'schedule/new',
                  lazy: async () => (await schedule()).create,
                  HydrateFallback: RouteLoadingPage,
                },
                {
                  path: 'schedule/:eventId',
                  lazy: async () => (await schedule()).detail,
                  HydrateFallback: RouteLoadingPage,
                },
              ],
            },
            {
              path: 'volunteers',
              lazy: volunteers,
              HydrateFallback: RouteLoadingPage,
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
    createAppRoutes({ sessionClient: new HttpSessionClient() }),
  )
}
