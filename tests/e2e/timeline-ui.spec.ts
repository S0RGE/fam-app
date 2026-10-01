import { expect, test } from '@playwright/test'
/* eslint-disable @typescript-eslint/no-explicit-any */

const personId = '11111111-1111-4111-8111-111111111111'
const episodeId = '22222222-2222-4222-8222-222222222222'
const noteId = '33333333-3333-4333-8333-333333333333'

const events: any[] = [
  {
    id: '44444444-4444-4444-8444-444444444444',
    type: 'episode_start',
    occurredAt: '2026-02-01T09:00:00.000Z',
    title: 'Начало эпизода «Сезонная аллергия»',
    description: null,
    source: 'manual',
    authorId: '55555555-5555-4555-8555-555555555555',
    episodeId,
    createdAt: '2026-02-01T09:00:00.000Z',
    updatedAt: '2026-02-01T09:00:00.000Z',
  },
  {
    id: noteId,
    type: 'note',
    occurredAt: '2026-02-02T10:30:00.000Z',
    title: 'Синтетическая заметка',
    description: 'Синтетическое описание',
    source: 'manual',
    authorId: '55555555-5555-4555-8555-555555555555',
    episodeId: null,
    createdAt: '2026-02-02T10:30:00.000Z',
    updatedAt: '2026-02-02T10:30:00.000Z',
  },
]

/**
 * Один catch-all перехват (паттерн tests/e2e/navigation.spec.ts):
 * Playwright исполняет несколько route-обработчиков в обратном порядке
 * регистрации, и route.continue() не пробует остальные перехваты —
 * разбивать API на несколько page.route() нельзя.
 */
function interceptApi(page: any, state: { events: any[]; patched?: any }) {
  page.route('**/api/v1/**', (route: any) => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    const json = (body: any, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      })
    if (url.pathname === '/api/v1/auth/session')
      return json({ data: { authenticated: true, setupRequired: false } })
    if (url.pathname === '/api/v1/auth/login')
      return json({ data: { authenticated: true, setupRequired: false } })
    if (
      url.pathname === `/api/v1/people/${personId}/episodes` &&
      method === 'GET'
    )
      return json({
        data: [{ id: episodeId, title: 'Сезонная аллергия' }],
        meta: { limit: 100, offset: 0, total: 1 },
      })
    if (url.pathname === `/api/v1/people/${personId}/medical-profile`)
      return json({
        data: {
          bloodGroup: null,
          rhesusFactor: null,
          generalComment: null,
          allergies: [],
          chronicConditions: [],
          warnings: [],
        },
      })
    if (url.pathname === `/api/v1/people/${personId}` && method === 'GET')
      return json({
        data: {
          id: personId,
          firstName: 'Иван',
          lastName: 'Иванов',
          middleName: null,
          birthDate: '2010-01-02',
          sex: 'male',
          familyRole: null,
          status: 'active',
        },
      })
    // Детальный путь проверить раньше общего: pathname строковый,
    // сравнение на equality не захватывает /timeline/:eventId.
    if (url.pathname === `/api/v1/people/${personId}/timeline/${noteId}`) {
      if (method === 'PATCH') {
        const body = route.request().postDataJSON()
        state.events = state.events.map((e: any) =>
          e.id === noteId ? { ...e, ...body } : e,
        )
        return json({ data: state.events.find((e: any) => e.id === noteId) })
      }
      if (method === 'DELETE') {
        state.events = state.events.filter((e: any) => e.id !== noteId)
        return json({ data: { id: noteId } })
      }
    }
    if (url.pathname === `/api/v1/people/${personId}/timeline`)
      return json({
        data: state.events,
        meta: { limit: 20, offset: 0, total: state.events.length },
      })
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
}

/** Вход в браузерную сессию через форму логина (как в navigation.spec.ts). */
async function login(page: any) {
  await page.goto('/login')
  await page.waitForFunction(
    () => '__vue_app__' in (document.querySelector('#__nuxt') || {}),
  )
  await page.getByLabel('Email').fill('test@example.com')
  await page.getByLabel('Пароль').fill('secret')
  await page.getByRole('button', { name: 'Войти' }).press('Enter')
  await expect(page).toHaveURL('/')
}

/** SSR-payload содержит реальный 503 (нет Supabase в e2e); useFetch не
 * повторяет запрос на hydration — принудительный клиентский refetch. */
async function refreshTimeline(page: any) {
  // До маунта Vue клик по «Применить» — нативный submit-релоад страницы.
  await page.waitForFunction(
    () => '__vue_app__' in (document.querySelector('#__nuxt') || {}),
  )
  await expect(
    page.getByRole('heading', { name: 'Медицинская хронология' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Применить' }).click()
  await expect(
    page.getByRole('status', { name: 'Загрузка событий…' }),
  ).toBeHidden()
}

test('timeline URL renders the timeline page, not the profile page', async ({
  page,
}) => {
  interceptApi(page, { events: [] })
  await login(page)
  await page.goto(`/people/${personId}/timeline`)
  await refreshTimeline(page)
  // Reg-тест против M001-дефекта структуры маршрутов (68be431):
  // родительская [personId]-страница не должна закрывать вложенные URL.
  await expect(
    page.getByRole('heading', { name: 'Медицинская хронология' }),
  ).toBeVisible()
  await expect(page.getByText('Событий пока нет.')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Данные человека' }),
  ).toHaveCount(0)
})

test('timeline list renders Russian types, times and episode link', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 })
  interceptApi(page, { events })
  await login(page)
  await page.goto(`/people/${personId}/timeline`)
  await refreshTimeline(page)
  // useFetch эпизодов (фильтр) срабатывает только на mount: повторный
  // mount через SPA-навигацию уже проходит под перехватом.
  await page.getByRole('link', { name: 'Назад к профилю' }).click()
  await expect(page.getByRole('heading', { name: 'Иванов Иван' })).toBeVisible()
  await page.getByRole('link', { name: 'Хронология' }).click()
  await expect(
    page.getByRole('heading', { name: 'Медицинская хронология' }),
  ).toBeVisible()
  await expect(
    page.locator('.event-type', { hasText: 'Начало эпизода' }),
  ).toBeVisible()
  await expect(
    page.locator('.event-type', { hasText: 'Заметка' }),
  ).toBeVisible()
  // Фильтр по эпизоду (spec §8): опция из списка эпизодов человека.
  await expect(
    page
      .getByLabel('Эпизод')
      .getByRole('option', { name: 'Сезонная аллергия' }),
  ).toBeAttached()
  await expect(page.getByText('Синтетическая заметка')).toBeVisible()
  await expect(page.getByText('Всего: 2')).toBeVisible()
  // авто-событие даёт ссылку на эпизод с aria-подписью
  const link = page.getByRole('link', { name: 'Открыть эпизод' }).first()
  await expect(link).toHaveAttribute(
    'href',
    `/people/${personId}/episodes/${episodeId}`,
  )
  await expect(link).toHaveAttribute(
    'aria-label',
    `Открыть эпизод: ${events[0].title}`,
  )
  // заметка: кнопки редактирования; авто-событие — только просмотр
  await expect(
    page.getByRole('button', { name: 'Редактировать' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Удалить' })).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})

test('timeline confirms note deletion and shows empty state', async ({
  page,
}) => {
  const state = { events }
  interceptApi(page, state)
  await login(page)
  await page.goto(`/people/${personId}/timeline`)
  await refreshTimeline(page)
  await expect(page.getByText('Синтетическая заметка')).toBeVisible()

  let dialogMessage = ''
  page.once('dialog', (dialog: any) => {
    dialogMessage = dialog.message()
    return dialog.accept()
  })
  await page.getByRole('button', { name: 'Удалить' }).click()
  expect(dialogMessage).toBe('Удалить заметку? Это действие нельзя отменить.')
  // Заметка удалена, остаётся авто-событие episode_start — список не пуст.
  await expect(page.getByText('Синтетическая заметка')).toHaveCount(0)
  await expect(page.getByText('Всего: 1')).toBeVisible()
  expect(state.events.length).toBe(1)
})

test('timeline note edit form saves changes', async ({ page }) => {
  const state = { events }
  interceptApi(page, state)
  await login(page)
  await page.goto(`/people/${personId}/timeline`)
  await refreshTimeline(page)
  await page.getByRole('button', { name: 'Редактировать' }).click()
  await expect(
    page.getByRole('heading', { name: 'Редактирование заметки' }),
  ).toBeVisible()
  await page.getByLabel('Заголовок').fill('Обновлённая заметка')
  await page.getByRole('button', { name: 'Сохранить' }).click()
  await expect(page.getByText('Обновлённая заметка')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Редактирование заметки' }),
  ).toHaveCount(0)
})
