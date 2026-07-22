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
