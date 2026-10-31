import { createContext, useContext } from 'react'
import type { SignInCommand, SessionState } from './session'

export type SessionContextValue = {
  readonly state: SessionState
  readonly restore: () => Promise<void>
  readonly signIn: (command: SignInCommand) => Promise<void>
  readonly signOut: () => Promise<void>
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession() {
  const session = useContext(SessionContext)

  if (!session) {
    throw new Error('Session hooks must be used inside SessionProvider.')
  }

  return session
}
