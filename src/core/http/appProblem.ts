export type AppProblem =
  | { readonly kind: 'validation'; readonly fields: Readonly<Record<string, string>> }
  | { readonly kind: 'unauthenticated' }
  | { readonly kind: 'forbidden' }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'conflict' }
  | { readonly kind: 'unavailable'; readonly retryAfterSeconds?: number }
  | { readonly kind: 'unexpected'; readonly correlationId?: string }

export class AppProblemError extends Error {
  readonly problem: AppProblem

  constructor(problem: AppProblem) {
    super(`Application problem: ${problem.kind}`)
    this.name = 'AppProblemError'
    this.problem = problem
  }
}

export async function responseProblem(response: Response) {
  const body = await readProblemBody(response)
  const problem = problemForStatus(response.status, body)
  if (problem.kind === 'unavailable') {
    return new AppProblemError({
      ...problem,
      retryAfterSeconds: readRetryAfter(response),
    })
  }
  if (problem.kind === 'unexpected') {
    return new AppProblemError({
      ...problem,
      correlationId: readCorrelationId(response, body),
    })
  }
  return new AppProblemError(problem)
}

export function normalizeNetworkError(error: unknown): unknown {
  return error instanceof TypeError
    ? new AppProblemError({ kind: 'unavailable' })
    : error
}

export function toAppProblem(error: unknown): AppProblem {
  return error instanceof AppProblemError
    ? error.problem
    : { kind: 'unexpected' }
}

export function unexpectedProblemMessage(
  problem: AppProblem,
  fallback: string,
) {
  return problem.kind === 'unexpected' && problem.correlationId
    ? `${fallback} Reference: ${problem.correlationId}.`
    : fallback
}

function problemForStatus(status: number, body: unknown): AppProblem {
  switch (status) {
    case 400:
    case 422:
      return { kind: 'validation', fields: readValidationFields(body) }
    case 401:
      return { kind: 'unauthenticated' }
    case 403:
      return { kind: 'forbidden' }
    case 404:
      return { kind: 'not-found' }
    case 409:
      return { kind: 'conflict' }
    case 429:
    case 502:
    case 503:
    case 504:
      return { kind: 'unavailable' }
    default:
      return { kind: 'unexpected' }
  }
}

function readValidationFields(value: unknown): Readonly<Record<string, string>> {
  if (!isRecord(value) || !isRecord(value.errors)) return {}

  const fields: Record<string, string> = {}
  for (const [key, messages] of Object.entries(value.errors)) {
    if (!Array.isArray(messages)) continue
    const message = messages.find(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    )
    if (message) fields[lowerFirst(key)] = message
  }
  return fields
}

function readRetryAfter(response: Response) {
  const value = response.headers.get('Retry-After')
  if (!value || !/^\d+$/.test(value)) return undefined
  const seconds = Number(value)
  return Number.isSafeInteger(seconds) ? seconds : undefined
}

function readCorrelationId(response: Response, body: unknown) {
  const header = response.headers.get('X-Correlation-ID')
  if (header?.trim()) return header.trim()
  if (!isRecord(body)) return undefined
  const value = body.traceId ?? body.correlationId
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

async function readProblemBody(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

function lowerFirst(value: string) {
  return value.length === 0 ? value : `${value[0].toLowerCase()}${value.slice(1)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
