import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// axe's environment detection probes canvas even when color-contrast rules are
// disabled. jsdom intentionally has no rendering context, so keep that probe
// quiet and leave contrast to browser and manual verification.
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: () => null,
})

afterEach(() => {
  cleanup()
})
