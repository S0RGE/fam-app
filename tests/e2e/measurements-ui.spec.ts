import { expect, test } from '@playwright/test'
/* eslint-disable @typescript-eslint/no-explicit-any */

const personId = '11111111-1111-4111-8111-111111111111'
const temperatureId = '22222222-2222-4222-8222-222222222222'
const pressureId = '33333333-3333-4333-8333-333333333333'
const episodeId = '44444444-4444-4444-8444-444444444444'
const measurementId = '55555555-5555-4555-8555-555555555555'

const types = [
  {
    id: temperatureId,
    name: 'Температура',
    category: 'Предустановленные показатели',
    description: null,
    valueType: 'number',
    unit: '°C',
    allowedUnits: ['°F'],
    status: 'active',
    isPreset: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: pressureId,
    name: 'Артериальное давление',
    category: 'Предустановленные показатели',
    description: null,
    valueType: 'compound',
    unit: 'мм рт. ст.',
    allowedUnits: [],
    status: 'active',
    isPreset: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]
const measurements = [
  {
    id: measurementId,
    measurementTypeId: temperatureId,
    episodeId,
    occurredAt: '2026-02-02T10:30:00.000Z',
    numericValue: 36.6,
    textValue: null,
    booleanValue: null,
    compoundValue: null,
    unit: '°C',
    comment: 'После сна',
    source: 'manual',
    createdAt: '2026-02-02T10:30:00.000Z',
    updatedAt: '2026-02-02T10:30:00.000Z',
  },
]

function interceptApi(
  page: any,
  state: { types: any[]; measurements: any[]; lastBody?: any },
) {
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
    if (url.pathname === `/api/v1/people/${personId}/medical-profile`)
      return json({ data: { profile: null } })
    if (
      url.pathname === `/api/v1/people/${personId}/episodes` &&
      method === 'GET'
    )
      return json({
        data: [{ id: episodeId, title: 'ОРВИ' }],
        meta: { limit: 100, offset: 0, total: 1 },
      })
    if (url.pathname === '/api/v1/measurements/types') {
      if (method === 'POST') {
        state.lastBody = route.request().postDataJSON()
        const created = {
          id: '66666666-6666-4666-8666-666666666666',
          ...state.lastBody,
          status: 'active',
          isPreset: false,
          createdAt: '2026-02-03T00:00:00.000Z',
          updatedAt: '2026-02-03T00:00:00.000Z',
        }
        state.types.push(created)
        return json({ data: created })
      }
      return json({
        data: state.types,
        meta: { limit: 100, offset: 0, total: state.types.length },
      })
    }
    const typeMatch = url.pathname.match(
      /^\/api\/v1\/measurements\/types\/([^/]+)$/,
    )
    if (typeMatch && method === 'PATCH') {
      state.lastBody = route.request().postDataJSON()
      state.types = state.types.map((type: any) =>
        type.id === typeMatch[1] ? { ...type, ...state.lastBody } : type,
      )
      return json({
        data: state.types.find((type: any) => type.id === typeMatch[1]),
      })
    }
    const measurementMatch = url.pathname.match(
      new RegExp(`^/api/v1/people/${personId}/measurements/([^/]+)$`),
    )
    if (measurementMatch) {
      if (method === 'PATCH') {
        state.lastBody = route.request().postDataJSON()
        state.measurements = state.measurements.map((measurement: any) =>
          measurement.id === measurementMatch[1]
            ? { ...measurement, ...state.lastBody }
            : measurement,
        )
        return json({
          data: state.measurements.find(
            (measurement: any) => measurement.id === measurementMatch[1],
          ),
        })
      }
      if (method === 'DELETE') {
        state.measurements = state.measurements.filter(
          (measurement: any) => measurement.id !== measurementMatch[1],
        )
        return json({ data: { id: measurementMatch[1] } })
      }
    }
    if (url.pathname === `/api/v1/people/${personId}/measurements`) {
      if (method === 'POST') {
        state.lastBody = route.request().postDataJSON()
        const created = {
          id: crypto.randomUUID(),
          ...state.lastBody,
          numericValue: state.lastBody.numericValue ?? null,
          textValue: state.lastBody.textValue ?? null,
          booleanValue: state.lastBody.booleanValue ?? null,
          compoundValue: state.lastBody.compoundValue ?? null,
          unit:
            state.lastBody.unit ??
            state.types.find(
              (type: any) => type.id === state.lastBody.measurementTypeId,
            )?.unit ??
            null,
          source: 'manual',
          createdAt: '2026-02-03T00:00:00.000Z',
          updatedAt: '2026-02-03T00:00:00.000Z',
        }
        state.measurements.unshift(created)
        return json({ data: created })
      }
      return json({
        data: state.measurements,
        meta: { limit: 20, offset: 0, total: state.measurements.length },
      })
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
}

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

async function openMeasurements(page: any) {
  await page.goto(`/people/${personId}/measurements`)
  await page.waitForFunction(
    () => '__vue_app__' in (document.querySelector('#__nuxt') || {}),
  )
  await expect(page.getByRole('heading', { name: 'Измерения' })).toBeVisible()
  await page.getByRole('link', { name: 'Назад к профилю' }).click()
  await expect(page.getByRole('heading', { name: 'Иванов Иван' })).toBeVisible()
  await page.getByRole('link', { name: 'Измерения' }).click()
  await expect(page.getByRole('heading', { name: 'Измерения' })).toBeVisible()
}

test('measurements render as a responsive filtered table with episode links', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 })
  const state = {
    types: structuredClone(types),
    measurements: structuredClone(measurements),
  }
  interceptApi(page, state)
  await login(page)
  await openMeasurements(page)

  await expect(
    page
      .getByLabel('Фильтр по типу')
      .getByRole('option', { name: 'Температура' }),
  ).toBeAttached()
  await expect(page.getByRole('columnheader', { name: 'Дата' })).toBeVisible()
  await expect(
    page.getByRole('columnheader', { name: 'Показатель' }),
  ).toBeVisible()
  await expect(page.getByText('36,6 °C')).toBeVisible()
  await expect(page.getByText('После сна')).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Открыть эпизод ОРВИ' }),
  ).toHaveAttribute('href', `/people/${personId}/episodes/${episodeId}`)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})

test('measurement form creates compound values and keeps server fields out', async ({
  page,
}) => {
  const state = {
    types: structuredClone(types),
    measurements: [] as any[],
    lastBody: undefined as any,
  }
  interceptApi(page, state)
  await login(page)
  await openMeasurements(page)

  await page.getByRole('button', { name: 'Добавить измерение' }).click()
  await page.getByLabel('Поиск типа показателя').fill('давление')
  await page.getByLabel('Тип показателя').selectOption(pressureId)
  await expect(page.getByLabel('Систолическое значение')).toBeVisible()
  await page.getByLabel('Систолическое значение').fill('120')
  await page.getByLabel('Диастолическое значение').fill('80')
  await page.getByLabel('Дата и время измерения').fill('2026-02-03T09:15')
  await page.getByLabel('Эпизод').selectOption(episodeId)
  await page.getByLabel('Комментарий').fill('Утром')
  await page.getByRole('button', { name: 'Сохранить измерение' }).click()

  expect(state.lastBody).toMatchObject({
    measurementTypeId: pressureId,
    compoundValue: { systolic: 120, diastolic: 80 },
    episodeId,
    comment: 'Утром',
  })
  expect(state.lastBody).not.toHaveProperty('familyId')
  expect(state.lastBody).not.toHaveProperty('personId')
  expect(state.lastBody).not.toHaveProperty('authorId')
  expect(state.lastBody).not.toHaveProperty('source')
  await expect(page.getByText('120/80 мм рт. ст.')).toBeVisible()
})

test('measurements can be edited and deleted with confirmation', async ({
  page,
}) => {
  const state = {
    types: structuredClone(types),
    measurements: structuredClone(measurements),
    lastBody: undefined as any,
  }
  interceptApi(page, state)
  await login(page)
  await openMeasurements(page)

  await page
    .getByRole('button', { name: 'Редактировать измерение Температура' })
    .click()
  await page.getByLabel('Числовое значение').fill('37.2')
  await page.getByRole('button', { name: 'Сохранить изменения' }).click()
  expect(state.lastBody).toMatchObject({ numericValue: 37.2 })
  expect(state.lastBody).not.toHaveProperty('measurementTypeId')
  await expect(page.getByText('37,2 °C')).toBeVisible()

  let message = ''
  page.once('dialog', (dialog: any) => {
    message = dialog.message()
    return dialog.accept()
  })
  await page
    .getByRole('button', { name: 'Удалить измерение Температура' })
    .click()
  expect(message).toBe('Удалить измерение? Это действие нельзя отменить.')
  await expect(page.getByText('Измерений пока нет.')).toBeVisible()
})

test('custom types can be searched, created and archived while presets stay protected', async ({
  page,
}) => {
  const state = {
    types: structuredClone(types),
    measurements: [] as any[],
    lastBody: undefined as any,
  }
  interceptApi(page, state)
  await login(page)
  await openMeasurements(page)

  await page.getByRole('button', { name: 'Настроить типы' }).click()
  await expect(page.getByText('Предустановленный').first()).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Редактировать тип Температура' }),
  ).toHaveCount(0)

  await page.getByRole('button', { name: 'Добавить тип' }).click()
  await page.getByLabel('Название типа').fill('Глюкоза')
  await page.getByLabel('Категория').fill('Анализы')
  await page.getByLabel('Тип значения').selectOption('number')
  await page.getByLabel('Основная единица').fill('ммоль/л')
  await page.getByLabel('Дополнительные единицы').fill('мг/дл')
  await page.getByRole('button', { name: 'Сохранить тип' }).click()
  expect(state.lastBody).toMatchObject({
    name: 'Глюкоза',
    category: 'Анализы',
    valueType: 'number',
    unit: 'ммоль/л',
    allowedUnits: ['мг/дл'],
  })

  await page.getByLabel('Поиск типов').fill('глю')
  const typeList = page.getByRole('list', { name: 'Список типов показателей' })
  await expect(typeList.getByRole('heading', { name: 'Глюкоза' })).toBeVisible()
  await expect(typeList.getByText('Температура')).toHaveCount(0)

  page.once('dialog', (dialog: any) => dialog.accept())
  await page.getByRole('button', { name: 'Архивировать тип Глюкоза' }).click()
  expect(state.lastBody).toEqual({ status: 'archived' })
  await expect(page.getByText('В архиве')).toBeVisible()
})
