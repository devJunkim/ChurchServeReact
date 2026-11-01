import { expect, type Page, test } from '@playwright/test'
import { E2E_ACCOUNT } from './test-account.js'

test.describe('ChurchServe critical workflows', () => {
  test.beforeEach(async ({ request }) => {
    const response = await request.post('/api/test/reset')
    expect(response.status()).toBe(204)
  })

  test('signs in, signs out, and protects the schedule', async ({ page }) => {
    await signIn(page)

    await page.getByRole('button', { name: 'Sign out' }).click()

    await expect(page).toHaveURL(
      /\/sign-in\?returnTo=%2Fschedule$/,
    )
    await expect(
      page.getByRole('heading', {
        name: 'Sign in to coordinate ChurchServe',
      }),
    ).toBeVisible()

    await page.goto('/schedule')
    await expect(page).toHaveURL(
      /\/sign-in\?returnTo=%2Fschedule$/,
    )
  })

  test('reveals validation and creates a service event', async ({ page }) => {
    await signIn(page)
    await page.getByRole('link', { name: 'Create service' }).click()

    await page.getByRole('button', { name: 'Add to schedule' }).click()
    await expect(page.getByLabel('Service name')).toBeFocused()
    await expect(page.getByText('Enter a service name.')).toBeVisible()

    await page.getByLabel('Service name').fill('Community Prayer Night')
    await page.getByLabel('Starts').fill('2026-11-20T19:00')
    await page.getByLabel('Ends').fill('2026-11-20T20:30')
    await page.getByLabel('Location').fill('Prayer Room')
    await page.getByRole('button', { name: 'Add to schedule' }).click()

    await expect(page).toHaveURL(/\/schedule\/[a-f0-9-]{36}$/)
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Community Prayer Night',
      }),
    ).toBeVisible()
    await expect(page.getByText('Prayer Room')).toBeVisible()
  })

  test('assigns an eligible volunteer using the keyboard', async ({ page }) => {
    await signIn(page)
    await page.goto('/schedule/sunday-2026-11-01')
    const position = page.getByRole('listitem', {
      name: 'Welcome host',
      exact: true,
    })
    const volunteer = position.getByLabel('Volunteer')

    await volunteer.focus()
    await page.keyboard.press('ArrowDown')
    const assign = position.getByRole('button', { name: 'Assign' })
    await expect(assign).toBeEnabled()
    await volunteer.focus()
    await page.keyboard.press('Tab')
    await expect(assign).toBeFocused()
    await page.keyboard.press('Space')

    await expect(page.getByRole('status')).toHaveText(
      'Anna Brooks was assigned.',
    )
    await expect(position).toContainText('Anna Brooks')
    await expect(position).toContainText('Confirmed')
    await expect(position).toBeFocused()
  })

  test('refreshes stale assignment data after a coordinator conflict', async ({
    page,
  }) => {
    await signIn(page)
    await page.goto('/schedule/sunday-2026-11-01')
    const secondPage = await page.context().newPage()
    await secondPage.goto('/schedule/sunday-2026-11-01')

    const firstPosition = page.getByRole('listitem', {
      name: 'Welcome host',
      exact: true,
    })
    const stalePosition = secondPage.getByRole('listitem', {
      name: 'Welcome host',
      exact: true,
    })
    await firstPosition.getByLabel('Volunteer').selectOption('anna-brooks')
    await stalePosition.getByLabel('Volunteer').selectOption('annette-lee')

    await firstPosition.getByRole('button', { name: 'Assign' }).click()
    await expect(page.getByRole('status')).toHaveText(
      'Anna Brooks was assigned.',
    )

    await stalePosition.getByRole('button', { name: 'Assign' }).click()

    await expect(secondPage.getByRole('alert')).toContainText(
      'The schedule changed after you loaded it.',
    )
    await expect(stalePosition).toContainText('Anna Brooks')
    await expect(stalePosition).toContainText('Confirmed')
  })
})

async function signIn(page: Page): Promise<void> {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(E2E_ACCOUNT.email)
  await page.getByLabel('Password').fill(E2E_ACCOUNT.password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/schedule$/)
  await expect(
    page.getByRole('heading', { name: 'Upcoming services' }),
  ).toBeVisible()
}
