export type CookieSource = () => string

export class MissingAntiforgeryTokenError extends Error {
  constructor() {
    super('The antiforgery token cookie is unavailable.')
    this.name = 'MissingAntiforgeryTokenError'
  }
}

export function browserCookieSource() {
  return globalThis.document?.cookie ?? ''
}

export function readAntiforgeryToken(cookieSource: CookieSource) {
  const cookie = cookieSource()
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith('XSRF-TOKEN='))

  if (!cookie) {
    throw new MissingAntiforgeryTokenError()
  }

  const encodedToken = cookie.slice('XSRF-TOKEN='.length)
  if (!encodedToken) {
    throw new MissingAntiforgeryTokenError()
  }

  return decodeURIComponent(encodedToken)
}
