export type CurrentUser = {
  readonly id: string
  readonly email: string
  readonly displayName: string
  readonly roles: readonly string[]
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
