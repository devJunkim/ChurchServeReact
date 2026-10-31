import { describe, expect, it } from 'vitest'
import { safeReturnTo } from './safeReturnTo'

describe('safeReturnTo', () => {
  it('preserves an internal route with its query and fragment', () => {
    expect(
      safeReturnTo(
        '?returnTo=%2Fschedule%2Fevent-1%3Fview%3Dstaffing%23positions',
      ),
    ).toBe('/schedule/event-1?view=staffing#positions')
  })

  it.each([
    '?returnTo=https%3A%2F%2Fevil.example',
    '?returnTo=%2F%2Fevil.example',
    '?returnTo=%2F%5Cevil.example',
  ])('rejects an external or ambiguous return target', (search) => {
    expect(safeReturnTo(search)).toBe('/schedule')
  })
})
