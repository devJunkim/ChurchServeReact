import type { ComponentType } from 'react'
import type { LoaderFunction } from 'react-router'

export type LazyRouteImplementation = {
  Component: ComponentType
  loader?: LoaderFunction
  ErrorBoundary?: ComponentType
}

export type ScheduleFeature = {
  Layout: ComponentType
  list: LazyRouteImplementation
  create: LazyRouteImplementation
  detail: LazyRouteImplementation
}

export type ScheduleFeatureLoader = () => Promise<ScheduleFeature>
export type VolunteerFeatureLoader = () => Promise<LazyRouteImplementation>
