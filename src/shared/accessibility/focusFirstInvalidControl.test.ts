import { describe, expect, it } from 'vitest'
import { focusFirstInvalidControl } from './focusFirstInvalidControl'

describe('focusFirstInvalidControl', () => {
  it('focuses the first control exposed as invalid within the supplied root', () => {
    const form = document.createElement('form')
    form.innerHTML = `
      <input id="valid-control">
      <input id="first-invalid" aria-invalid="true">
      <input id="second-invalid" aria-invalid="true">
    `
    document.body.append(form)

    focusFirstInvalidControl(form)

    expect(document.activeElement).toBe(form.querySelector('#first-invalid'))
    form.remove()
  })
})
