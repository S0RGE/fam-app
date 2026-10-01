import { expect, test } from '@playwright/test'
/* eslint-disable @typescript-eslint/no-explicit-any */
const person = {
  id: '11111111-1111-4111-8111-111111111111',
  firstName: 'Иван',
  lastName: 'Иванов',
  middleName: null,
  birthDate: '2010-01-02',
  sex: 'male',
  familyRole: null,
  status: 'active',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

test('login renders safe field-level validation feedback', async ({ page }) => {
  await page.route('**/api/v1/auth/login', (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Проверьте заполненные поля',
          requestId: 'synthetic-request',
          fields: { email: 'Некорректный адрес email' },
        },
      }),
    }),
  )
  await page.goto('/login')
  await page.waitForFunction(
    () => '__vue_app__' in (document.querySelector('#__nuxt') || {}),
  )
  await page.getByLabel('Email').fill('test@example.com')
  await page.getByLabel('Пароль').fill('synthetic-password')
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page.getByText('Некорректный адрес email')).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Не удалось войти')
})

test('mocked auth, family and people journey remains keyboard reachable at 320px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 })
  let archived = false
  let setupRequired = false
  let profile: any = {
    bloodGroup: null,
    rhesusFactor: null,
    generalComment: null,
    allergies: [
      {
        id: 'item',
        name: 'Пыльца',
        description: null,
        status: 'active',
        createdAt: 'x',
        updatedAt: 'x',
      },
    ],
    chronicConditions: [],
    warnings: [],
  }
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    const json = (body: any, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      })
    if (url.pathname === '/api/v1/auth/session')
      return json({ data: { authenticated: true, setupRequired } })
    if (url.pathname === '/api/v1/auth/login')
      return json({ data: { authenticated: true, setupRequired } })
    if (url.pathname === '/api/v1/auth/logout')
      return json({ data: { authenticated: false } })
    if (url.pathname === '/api/v1/family' && method === 'POST') {
      setupRequired = false
      return json({ data: { id: 'family', name: 'Семья' } })
    }
    if (url.pathname === '/api/v1/people' && method === 'GET')
      return json({
        data: archived ? [] : [person],
        meta: { limit: 20, offset: 0, total: archived ? 0 : 1 },
      })
    if (url.pathname === '/api/v1/people' && method === 'POST')
      return json({ data: person })
    if (url.pathname === `/api/v1/people/${person.id}` && method === 'GET')
      return json({
        data: { ...person, status: archived ? 'archived' : 'active' },
      })
    if (url.pathname === `/api/v1/people/${person.id}` && method === 'PATCH')
      return json({ data: person })
    if (url.pathname.endsWith('/archive')) {
      archived = true
      return json({ data: { ...person, status: 'archived' } })
    }
    if (url.pathname.endsWith('/restore')) {
      archived = false
      return json({ data: person })
    }
    if (url.pathname.endsWith('/medical-profile') && method === 'GET')
      return json({ data: { profile } })
    if (url.pathname.endsWith('/medical-profile') && method === 'PUT') {
      profile = route.request().postDataJSON()
      expect(profile.allergies[0]).toEqual({
        name: 'Пыльца',
        description: null,
        status: 'active',
      })
      return json({ data: profile })
    }
    return json(
      {
        error: {
          code: 'NOT_FOUND',
          message: 'Ресурс не найден',
          requestId: 'test',
        },
      },
      404,
    )
  })
  await page.goto('/login')
  await page.waitForFunction(
    () => '__vue_app__' in (document.querySelector('#__nuxt') || {}),
  )
  await page.getByLabel('Email').fill('test@example.com')
  await page.getByLabel('Пароль').fill('secret')
  await page.getByRole('button', { name: 'Войти' }).press('Enter')
  await expect(page).toHaveURL('/')
  await page.getByLabel('Имя').fill('Иван')
  await page.getByLabel('Фамилия').fill('Иванов')
  await page.getByLabel('Дата рождения').fill('2010-01-02')
  await page.getByRole('button', { name: 'Добавить' }).click()
  await expect(page).toHaveURL('/people')
  const link = page.getByRole('link', { name: 'Иванов Иван' })
  await link.focus()
  await expect(link).toBeFocused()
  await link.press('Enter')
  await expect(page.getByRole('heading', { name: 'Иванов Иван' })).toBeVisible()
  await page.getByLabel('Имя').fill('Пётр')
  await page.getByRole('button', { name: 'Сохранить данные' }).click()
  await expect(page.getByRole('status')).toContainText('Профиль сохранён')
  await page.getByLabel('Общий комментарий').fill('Синтетический комментарий')
  await page
    .getByRole('button', { name: 'Сохранить медицинский профиль' })
    .click()
  await expect(page.getByRole('status')).toContainText('сохранён')
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Архивировать' }).click()
  await expect(page.getByRole('status')).toContainText('архивирован')
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Восстановить' }).click()
  await expect(page.getByRole('status')).toContainText('восстановлен')
  await page.getByRole('button', { name: 'Выйти' }).click()
  await expect(page).toHaveURL('/login')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})
