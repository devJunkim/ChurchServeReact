import { Navigate, Outlet, useLocation } from 'react-router'
import { hasPermission, type Permission } from './session'
import { useSession } from './sessionContext'

type RequirePermissionProps = {
  readonly permission: Permission
}

export function RequirePermission({ permission }: RequirePermissionProps) {
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

  return hasPermission(state.user, permission) ? (
    <Outlet />
  ) : (
    <Navigate replace to="/unavailable" />
  )
}
