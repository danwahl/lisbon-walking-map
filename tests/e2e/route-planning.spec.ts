import { expect, test } from '@playwright/test'

test('finds and displays a walking route between two addresses', async ({ page }) => {
  await page.goto('/')

  await page.getByLabel('From').fill('Praça do Comércio, Lisboa')
  await page.getByRole('button', { name: /Comércio/ }).first().click()

  await page.getByLabel('To').fill('Rossio, Lisboa')
  await page.getByRole('button', { name: /Rossio/ }).first().click()

  await page.getByRole('button', { name: 'Get route' }).click()

  // The route polyline renders inside Leaflet's SVG overlay pane.
  await expect(page.locator('.leaflet-overlay-pane path')).toBeVisible()

  await expect(page.getByText(/km$/)).toBeVisible()
  await expect(page.getByText(/min$/)).toBeVisible()
  await expect(page.getByText('Distance', { exact: true })).toBeVisible()
  await expect(page.getByText('Est. time', { exact: true })).toBeVisible()
})
