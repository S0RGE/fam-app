import { expect, test } from '@playwright/test'

test('navigation remains reachable on a 320px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/')

  await expect(
    page.getByRole('navigation', { name: 'Основная навигация' }),
  ).toBeVisible()
  const searchLink = page.getByRole('link', { name: 'Поиск' })
  await searchLink.focus()
  await expect(searchLink).toBeFocused()
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true)

  await searchLink.press('Enter')
  await expect(page).toHaveURL('/search')
  await expect(
    page.getByRole('heading', { name: 'Глобальный поиск' }),
  ).toBeVisible()
})
