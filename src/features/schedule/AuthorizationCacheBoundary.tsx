import { useEffect, useRef, type ReactNode } from 'react'
import { useSession } from '../../core/auth/sessionContext'
import { useAssignmentStore } from './assignmentStoreContext'
import { useScheduleStore } from './scheduleStoreContext'

export function AuthorizationCacheBoundary({
  children,
}: {
  readonly children: ReactNode
}) {
  const { state } = useSession()
  const scheduleStore = useScheduleStore()
  const assignmentStore = useAssignmentStore()
  const identity =
    state.status === 'authenticated'
      ? `${state.user.id}|${[...state.user.permissions].sort().join(',')}`
      : state.status
  const previousIdentity = useRef(identity)

  useEffect(() => {
    if (previousIdentity.current === identity) return
    previousIdentity.current = identity
    scheduleStore.clear()
    assignmentStore.clear()
  }, [assignmentStore, identity, scheduleStore])

  return children
}
