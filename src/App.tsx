import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { SessionProvider } from './core/auth/SessionProvider'
import { useSession } from './core/auth/sessionContext'
import type { SessionClient } from './core/auth/sessionClient'
import './styles/app.css'

function navLinkClassName({ isActive }: { isActive: boolean }) {
  return isActive ? 'active' : undefined
}

type AppProps = {
  sessionClient: SessionClient
}

export function App({ sessionClient }: AppProps) {
  return (
    <SessionProvider client={sessionClient}>
      <AppShell />
    </SessionProvider>
  )
}

function AppShell() {
  const { state, restore, signOut } = useSession()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string>()

  async function endSession() {
    setIsSigningOut(true)
    setSignOutError(undefined)

    try {
      await signOut()
    } catch {
      setSignOutError('ChurchServe could not sign you out. Try again.')
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="application-shell">
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>

        <header className="site-header">
          <NavLink className="brand" to="/" aria-label="ChurchServe home">
            <span className="brand-mark" aria-hidden="true">
              CS
            </span>
            <span>ChurchServe</span>
          </NavLink>

          <div className="session-navigation">
            {state.status === 'authenticated' ? (
              <>
                <nav aria-label="Primary navigation">
                  <NavLink className={navLinkClassName} to="/schedule">
                    Schedule
                  </NavLink>
                  <NavLink className={navLinkClassName} to="/volunteers">
                    Volunteers
                  </NavLink>
                </nav>
                <span className="current-user">{state.user.displayName}</span>
                <button
                  className="sign-out-action"
                  type="button"
                  disabled={isSigningOut}
                  onClick={() => void endSession()}
                >
                  {isSigningOut ? 'Signing out…' : 'Sign out'}
                </button>
              </>
            ) : state.status === 'checking' ? (
              <span className="session-status" role="status">
                Checking session…
              </span>
            ) : state.status === 'anonymous' ? (
              <NavLink className={navLinkClassName} to="/sign-in">
                Sign in
              </NavLink>
            ) : (
              <span className="session-status">Session unavailable</span>
            )}
          </div>
        </header>

        <main id="main-content" tabIndex={-1}>
          {state.status === 'checking' ? (
            <p className="session-panel" role="status">
              Restoring your ChurchServe session…
            </p>
          ) : state.status === 'unavailable' ? (
            <section className="session-panel" role="alert">
              <h1>We could not verify your session</h1>
              <p>{state.message}</p>
              <button
                className="session-retry"
                type="button"
                onClick={() => void restore().catch(() => undefined)}
              >
                Try again
              </button>
            </section>
          ) : (
            <Outlet />
          )}
          {signOutError && (
            <p className="session-action-error" role="alert">
              {signOutError}
            </p>
          )}
        </main>

        <footer className="site-footer">
          <p>Thoughtful scheduling for people who serve.</p>
        </footer>
    </div>
  )
}
