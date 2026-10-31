import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { SessionContext } from './sessionContext'
import type { SignInCommand, SessionState } from './session'
import type { SessionClient } from './sessionClient'

type SessionProviderProps = {
  readonly children: ReactNode
  readonly client: SessionClient
}

export function SessionProvider({ children, client }: SessionProviderProps) {
  const [state, setState] = useState<SessionState>({ status: 'checking' })
  const activeRestore = useRef<AbortController | null>(null)

  const restoreSession = useCallback(async (showChecking: boolean) => {
    activeRestore.current?.abort()
    const controller = new AbortController()
    activeRestore.current = controller
    if (showChecking) {
      setState({ status: 'checking' })
    }

    try {
      const user = await client.restore(controller.signal)
      controller.signal.throwIfAborted()
      setState(
        user
          ? { status: 'authenticated', user }
          : { status: 'anonymous' },
      )
    } catch (error) {
      if (!controller.signal.aborted) {
        setState({
          status: 'unavailable',
          message: 'ChurchServe could not verify your session. Try again.',
        })
      }
      throw error
    } finally {
      if (activeRestore.current === controller) {
        activeRestore.current = null
      }
    }
  }, [client])

  useEffect(() => {
    const controller = new AbortController()
    activeRestore.current = controller

    void client
      .restore(controller.signal)
      .then((user) => {
        if (!controller.signal.aborted) {
          setState(
            user
              ? { status: 'authenticated', user }
              : { status: 'anonymous' },
          )
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({
            status: 'unavailable',
            message: 'ChurchServe could not verify your session. Try again.',
          })
        }
      })

    return () => {
      controller.abort()
      if (activeRestore.current === controller) {
        activeRestore.current = null
      }
    }
  }, [client])

  const value = useMemo(
    () => ({
      state,
      restore: () => restoreSession(true),
      signIn: async (command: SignInCommand) => {
        const user = await client.signIn(command)
        setState({ status: 'authenticated', user })
      },
      signOut: async () => {
        await client.signOut()
        setState({ status: 'anonymous' })
      },
    }),
    [client, restoreSession, state],
  )

  return <SessionContext value={value}>{children}</SessionContext>
}
