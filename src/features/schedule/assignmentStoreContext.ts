import { createContext, useContext, useSyncExternalStore } from 'react'
import type { AssignmentStore } from './assignmentStore'

export const AssignmentStoreContext = createContext<AssignmentStore | null>(null)

export function useAssignmentStore() {
  const store = useContext(AssignmentStoreContext)
  if (!store) {
    throw new Error(
      'Assignment store hooks must be used inside AssignmentStoreProvider.',
    )
  }
  return store
}

export function useAssignmentSnapshot() {
  const store = useAssignmentStore()
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}
