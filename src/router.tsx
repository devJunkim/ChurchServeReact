import { createBrowserRouter, type RouteObject } from 'react-router'
import { App } from './App'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PlaceholderPage } from './pages/PlaceholderPage'

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    Component: App,
    children: [
      { index: true, Component: HomePage },
      {
        path: 'schedule',
        element: (
          <PlaceholderPage
            eyebrow="Schedule"
            title="Service schedules are coming next"
          >
            Part 2 will turn service events into reusable components with typed
            props and explicit interaction callbacks.
          </PlaceholderPage>
        ),
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
