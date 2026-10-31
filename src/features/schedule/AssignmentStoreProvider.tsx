import { useEffect, type ReactNode } from 'react'
import type { AssignmentStore } from './assignmentStore'
import { AssignmentStoreContext } from './assignmentStoreContext'

type AssignmentStoreProviderProps = {
  readonly children: ReactNode
  readonly store: AssignmentStore
}

export function AssignmentStoreProvider({
  children,
  store,
}: AssignmentStoreProviderProps) {
  useEffect(() => () => store.dispose(), [store])
  return <AssignmentStoreContext value={store}>{children}</AssignmentStoreContext>
}
