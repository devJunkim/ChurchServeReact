import type { ReactNode } from 'react'
import { SessionContext } from '../core/auth/sessionContext'
import type { CurrentUser } from '../core/auth/session'

const testingCurrentUser: CurrentUser = {
  id: 'coordinator-1',
  email: 'coordinator@churchserve.local',
  displayName: 'Demo Coordinator',
  roles: ['scheduler'],
  permissions: [
    'schedule.read',
    'schedule.manage',
    'volunteer.read',
    'volunteer.manage',
  ],
}

export function TestingSessionProvider({
  children,
  user = testingCurrentUser,
}: {
  readonly children: ReactNode
  readonly user?: CurrentUser
}) {
  return (
    <SessionContext
      value={{
        state: { status: 'authenticated', user },
        restore: async () => undefined,
        signIn: async () => undefined,
        signOut: async () => undefined,
      }}
    >
      {children}
    </SessionContext>
  )
}
