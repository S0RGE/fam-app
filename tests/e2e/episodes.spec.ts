import { expect, test } from '@playwright/test'

const origin = 'http://127.0.0.1:4173'
const personId = '11111111-1111-4111-8111-111111111111'
const episodeId = '22222222-2222-4222-8222-222222222222'

function expectErrorEnvelope(
  body: unknown,
  code: string,
  fields?: Record<string, string>,
) {
  expect(body).toMatchObject({
    error: {
      code,
      message: expect.any(String),
      requestId: expect.any(String),
      ...(fields ? { fields } : {}),
    },
  })
}

test('episode mutations reject missing and cross-site origins', async ({
  request,
}) => {
  const missing = await request.post(`/api/v1/people/${personId}/episodes`, {
    data: { title: 'Синтетический эпизод', startedAt: '2026-01-01T00:00:00Z' },
  })
  expect(missing.status()).toBe(403)
  expectErrorEnvelope(await missing.json(), 'ORIGIN_FORBIDDEN')

  const crossSite = await request.put(
    `/api/v1/people/${personId}/episodes/${episodeId}`,
    {
      headers: { Origin: 'https://attacker.example' },
      data: { status: 'completed' },
    },
  )
  expect(crossSite.status()).toBe(403)
  expectErrorEnvelope(await crossSite.json(), 'ORIGIN_FORBIDDEN')

  const deleteMissing = await request.delete(
    `/api/v1/people/${personId}/episodes/${episodeId}`,
  )
  expect(deleteMissing.status()).toBe(403)
  expectErrorEnvelope(await deleteMissing.json(), 'ORIGIN_FORBIDDEN')
})

test('episode list enforces strict query validation', async ({ request }) => {
  const duplicate = await request.get(
    `/api/v1/people/${personId}/episodes?status=active&status=completed`,
  )
  expect(duplicate.status()).toBe(400)
  expectErrorEnvelope(await duplicate.json(), 'VALIDATION_ERROR', {
    query: 'Недопустимые параметры',
  })

  const unknown = await request.get(
    `/api/v1/people/${personId}/episodes?unknown=1`,
  )
  expect(unknown.status()).toBe(400)
  expectErrorEnvelope(await unknown.json(), 'VALIDATION_ERROR', {
    query: 'Недопустимые параметры',
  })

  const badLimit = await request.get(
    `/api/v1/people/${personId}/episodes?limit=0`,
  )
  expect(badLimit.status()).toBe(400)
  const badLimitBody = await badLimit.json()
  expectErrorEnvelope(badLimitBody, 'VALIDATION_ERROR')
  expect(badLimitBody.error.fields.limit).toBeTruthy()
})

test('episode routes validate identifiers before authorization', async ({
  request,
}) => {
  const badPerson = await request.get('/api/v1/people/not-a-uuid/episodes')
  expect(badPerson.status()).toBe(400)
  expectErrorEnvelope(await badPerson.json(), 'VALIDATION_ERROR')

  const badEpisode = await request.get(
    `/api/v1/people/${personId}/episodes/not-a-uuid`,
  )
  expect(badEpisode.status()).toBe(400)
  expectErrorEnvelope(await badEpisode.json(), 'VALIDATION_ERROR')
})

test('episode create validates the body before authorization', async ({
  request,
}) => {
  const invalid = await request.post(`/api/v1/people/${personId}/episodes`, {
    headers: { Origin: origin },
    data: { title: '', startedAt: 'не дата', unknown: true },
  })
  expect(invalid.status()).toBe(400)
  const invalidBody = await invalid.json()
  expectErrorEnvelope(invalidBody, 'VALIDATION_ERROR')
  expect(invalidBody.error.fields.title).toBeTruthy()
  expect(invalidBody.error.fields.startedAt).toBeTruthy()

  const inverted = await request.post(`/api/v1/people/${personId}/episodes`, {
    headers: { Origin: origin },
    data: {
      title: 'Синтетический эпизод',
      startedAt: '2026-02-01T00:00:00Z',
      endedAt: '2026-01-01T00:00:00Z',
    },
  })
  expect(inverted.status()).toBe(400)
  const invertedBody = await inverted.json()
  expectErrorEnvelope(invertedBody, 'VALIDATION_ERROR')
  expect(invertedBody.error.fields.endedAt).toBe(
    'Дата завершения не ранее даты начала',
  )
})

test('episode transition validates the status payload', async ({ request }) => {
  const invalid = await request.put(
    `/api/v1/people/${personId}/episodes/${episodeId}`,
    {
      headers: { Origin: origin },
      data: { status: 'archived' },
    },
  )
  expect(invalid.status()).toBe(400)
  expectErrorEnvelope(await invalid.json(), 'VALIDATION_ERROR')

  const update = await request.patch(
    `/api/v1/people/${personId}/episodes/${episodeId}`,
    {
      headers: { Origin: origin },
      data: { title: '' },
    },
  )
  expect(update.status()).toBe(400)
  const updateBody = await update.json()
  expectErrorEnvelope(updateBody, 'VALIDATION_ERROR')
  expect(updateBody.error.fields.title).toBeTruthy()
})

test('episode list requires authentication', async ({ request }) => {
  const response = await request.get(`/api/v1/people/${personId}/episodes`)
  expect(response.status()).toBe(401)
  expectErrorEnvelope(await response.json(), 'UNAUTHENTICATED')
})

// Отложенные сценарии (требуют disposable Supabase-проекта и реальной
// учётной записи): создание и завершение эпизода через браузерный сценарий
// с cookie-сессией, RLS-проверка между двумя семьями, выполнение миграции
// 0002_episodes.sql и атомарность upsert_episode. Отмечены pending согласно
// README (раздел «Проверки»).
