import { createBrowserRouter, type RouteObject } from 'react-router'
import { App } from './App'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { SchedulePage } from './features/schedule/SchedulePage'

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    Component: App,
    children: [
      { index: true, Component: HomePage },
      {
        path: 'schedule',
        Component: SchedulePage,
      },
      {
        path: 'volunteers',
        element: (
          <PlaceholderPage eyebrow="Volunteers" title="Volunteer tools are on the way">
            Later parts will model availability, ministry eligibility, search,
            and assignments without changing this application shell.
          </PlaceholderPage>
        ),
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
]

export function createAppRouter() {
  return createBrowserRouter(appRoutes)
}
