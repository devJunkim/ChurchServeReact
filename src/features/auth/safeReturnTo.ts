const applicationOrigin = 'https://churchserve.local'

export function safeReturnTo(search: string, fallback = '/schedule') {
  const candidate = new URLSearchParams(search).get('returnTo')

  if (
    !candidate ||
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.includes('\\')
  ) {
    return fallback
  }

  const target = new URL(candidate, applicationOrigin)
  if (target.origin !== applicationOrigin) {
    return fallback
  }

  return `${target.pathname}${target.search}${target.hash}`
}
