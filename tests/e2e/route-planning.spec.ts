import { expect, test } from '@playwright/test'

test('finds and displays a walking route between two addresses', async ({ page }) => {
  await page.goto('/')

  await page.getByLabel('From').fill('Praça do Comércio, Lisboa')
  await page.getByRole('button', { name: /Comércio/ }).first().click()

  await page.getByLabel('To').fill('Rossio, Lisboa')
  await page.getByRole('button', { name: /Rossio/ }).first().click()

  await page.getByRole('button', { name: 'Get route' }).click()

  // One polyline per route mode (lowest energy, fastest, shortest, lowest climb)
  // renders inside Leaflet's SVG overlay pane.
  await expect(page.locator('.leaflet-overlay-pane path')).toHaveCount(4)

  const energyCard = page.getByRole('button', { name: /^Lowest energy/ })
  const fastestCard = page.getByRole('button', { name: /^Fastest/ })
  const shortestCard = page.getByRole('button', { name: /^Shortest/ })
  const lowestClimbCard = page.getByRole('button', { name: /^Lowest climb/ })
  await expect(energyCard).toBeVisible()
  await expect(fastestCard).toBeVisible()
  await expect(shortestCard).toBeVisible()
  await expect(lowestClimbCard).toBeVisible()

  await expect(page.getByText(/km$/).first()).toBeVisible()
  await expect(page.getByText(/min$/).first()).toBeVisible()
  await expect(page.getByText(/kcal$/).first()).toBeVisible()

  // Selecting the "fastest" route hands it the "Selected" badge instead.
  await expect(energyCard.getByText('Selected', { exact: true })).toBeVisible()
  await fastestCard.click()
  await expect(fastestCard.getByText('Selected', { exact: true })).toBeVisible()
})

test('shares a route via the URL and the share button', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')

  await page.getByLabel('From').fill('Praça do Comércio, Lisboa')
  await page.getByRole('button', { name: /Comércio/ }).first().click()
  await page.getByLabel('To').fill('Rossio, Lisboa')
  await page.getByRole('button', { name: /Rossio/ }).first().click()
  await page.getByRole('button', { name: 'Get route' }).click()
  await expect(page.locator('.leaflet-overlay-pane path')).toHaveCount(4)

  // Switching the selected route updates the address bar without a fresh submit.
  const fastestCard = page.getByRole('button', { name: /^Fastest/ })
  await fastestCard.click()
  await expect(page).toHaveURL(/mode=time/)
  const sharedUrl = page.url()

  await page.getByRole('button', { name: 'Share route' }).click()
  await expect(page.getByRole('button', { name: 'Link copied!' })).toBeVisible()
  const clipboardText = (await page.evaluate('navigator.clipboard.readText()')) as string
  expect(clipboardText).toBe(sharedUrl)

  // Loading the shared link directly reproduces the same route and selection,
  // with no manual address entry.
  await page.goto(sharedUrl)
  await expect(page.locator('.leaflet-overlay-pane path')).toHaveCount(4)
  await expect(page.getByRole('button', { name: /^Fastest/ }).getByText('Selected', { exact: true })).toBeVisible()
})

test('reverses origin and destination', async ({ page }) => {
  await page.goto('/')

  await page.getByLabel('From').fill('Praça do Comércio, Lisboa')
  await page.getByRole('button', { name: /Comércio/ }).first().click()
  await page.getByLabel('To').fill('Rossio, Lisboa')
  await page.getByRole('button', { name: /Rossio/ }).first().click()
  await page.getByRole('button', { name: 'Get route' }).click()
  await expect(page.locator('.leaflet-overlay-pane path')).toHaveCount(4)

  const fromValue = await page.getByLabel('From').inputValue()
  const toValue = await page.getByLabel('To').inputValue()

  await page.getByRole('button', { name: 'Reverse route' }).click()

  // Reversing re-requests a route immediately, so the previous polylines are
  // torn down and redrawn — wait for that to settle before reading fields.
  await expect(page.locator('.leaflet-overlay-pane path')).toHaveCount(4)
  await expect(page.getByLabel('From')).toHaveValue(toValue)
  await expect(page.getByLabel('To')).toHaveValue(fromValue)
})
