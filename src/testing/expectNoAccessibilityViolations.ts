import axe, { type Result } from 'axe-core'
import { expect } from 'vitest'

export async function expectNoAccessibilityViolations(
  root: Element,
): Promise<void> {
  const results = await axe.run(root, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
    },
    rules: {
      'color-contrast': { enabled: false },
      'link-in-text-block': { enabled: false },
    },
  })

  expect(results.violations, formatViolations(results.violations)).toEqual([])
}

function formatViolations(violations: Result[]): string {
  return violations
    .map(
      (violation) =>
        `${violation.id}: ${violation.help}\n${violation.nodes
          .map(
            (node) =>
              `  ${node.target.join(' ')}: ${node.failureSummary ?? ''}`,
          )
          .join('\n')}`,
    )
    .join('\n\n')
}
