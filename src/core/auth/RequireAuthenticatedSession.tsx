import { Navigate, Outlet, useLocation } from 'react-router'
import { useSession } from './sessionContext'

export function RequireAuthenticatedSession() {
  const { state } = useSession()
  const location = useLocation()

  if (state.status !== 'authenticated') {
    const returnTo = `${location.pathname}${location.search}${location.hash}`

    return (
      <Navigate
        replace
        to={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
      />
    )
  }

  return <Outlet />
}
