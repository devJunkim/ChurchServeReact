import { RequirePermission } from './RequirePermission'
import { PERMISSIONS } from './session'

export function RequireScheduleRead() {
  return <RequirePermission permission={PERMISSIONS.scheduleRead} />
}

export function RequireScheduleManage() {
  return <RequirePermission permission={PERMISSIONS.scheduleManage} />
}

export function RequireVolunteerRead() {
  return <RequirePermission permission={PERMISSIONS.volunteerRead} />
}
