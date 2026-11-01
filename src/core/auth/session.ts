export const PERMISSIONS = {
  scheduleRead: 'schedule.read',
  scheduleManage: 'schedule.manage',
  volunteerRead: 'volunteer.read',
  volunteerManage: 'volunteer.manage',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export type CurrentUser = {
  readonly id: string
  readonly email: string
  readonly displayName: string
  readonly roles: readonly string[]
  readonly permissions: readonly Permission[]
}

export function isPermission(value: unknown): value is Permission {
  return (
    typeof value === 'string' &&
    Object.values(PERMISSIONS).includes(value as Permission)
  )
}

export function hasPermission(
  user: CurrentUser | undefined,
  permission: Permission,
) {
  return user?.permissions.includes(permission) ?? false
}

export type SignInCommand = {
  readonly email: string
  readonly password: string
}

export type SessionState =
  | { readonly status: 'checking' }
  | { readonly status: 'anonymous' }
  | { readonly status: 'authenticated'; readonly user: CurrentUser }
  | { readonly status: 'unavailable'; readonly message: string }
