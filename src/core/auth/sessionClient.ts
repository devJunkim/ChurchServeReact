import type { CurrentUser, SignInCommand } from './session'

export interface SessionClient {
  restore: (signal?: AbortSignal) => Promise<CurrentUser | undefined>
  signIn: (
    command: SignInCommand,
    signal?: AbortSignal,
  ) => Promise<CurrentUser>
  signOut: (signal?: AbortSignal) => Promise<void>
}
