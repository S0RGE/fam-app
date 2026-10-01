import { expect, test } from '@playwright/test'

const origin = 'http://127.0.0.1:4173'
const personId = '11111111-1111-4111-8111-111111111111'
const eventId = '33333333-3333-4333-8333-333333333333'

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

test('timeline mutations reject missing and cross-site origins', async ({
  request,
}) => {
  const missing = await request.post(`/api/v1/people/${personId}/timeline`, {
    data: {
      occurredAt: '2026-01-01T00:00:00Z',
      title: 'Синтетическая заметка',
    },
  })
  expect(missing.status()).toBe(403)
  expectErrorEnvelope(await missing.json(), 'ORIGIN_FORBIDDEN')

  const crossSite = await request.patch(
    `/api/v1/people/${personId}/timeline/${eventId}`,
    {
      headers: { Origin: 'https://attacker.example' },
      data: { title: 'Синтетическая заметка' },
    },
  )
  expect(crossSite.status()).toBe(403)
  expectErrorEnvelope(await crossSite.json(), 'ORIGIN_FORBIDDEN')

  const deleteMissing = await request.delete(
    `/api/v1/people/${personId}/timeline/${eventId}`,
  )
  expect(deleteMissing.status()).toBe(403)
  expectErrorEnvelope(await deleteMissing.json(), 'ORIGIN_FORBIDDEN')
})

test('timeline list enforces strict query validation', async ({ request }) => {
  const duplicate = await request.get(
    `/api/v1/people/${personId}/timeline?from=2026-01-01T00:00:00Z&from=2026-02-01T00:00:00Z`,
  )
  expect(duplicate.status()).toBe(400)
  expectErrorEnvelope(await duplicate.json(), 'VALIDATION_ERROR', {
    query: 'Недопустимые параметры',
  })

  const unknown = await request.get(
    `/api/v1/people/${personId}/timeline?unknown=1`,
  )
  expect(unknown.status()).toBe(400)
  expectErrorEnvelope(await unknown.json(), 'VALIDATION_ERROR', {
    query: 'Недопустимые параметры',
  })

  const badLimit = await request.get(
    `/api/v1/people/${personId}/timeline?limit=0`,
  )
  expect(badLimit.status()).toBe(400)
  const badLimitBody = await badLimit.json()
  expectErrorEnvelope(badLimitBody, 'VALIDATION_ERROR')
  expect(badLimitBody.error.fields.limit).toBeTruthy()

  const badType = await request.get(
    `/api/v1/people/${personId}/timeline?type=bogus`,
  )
  expect(badType.status()).toBe(400)
  const badTypeBody = await badType.json()
  expectErrorEnvelope(badTypeBody, 'VALIDATION_ERROR')
  expect(badTypeBody.error.fields.type).toBeTruthy()
})

test('timeline routes validate identifiers before authorization', async ({
  request,
}) => {
  const badPerson = await request.get('/api/v1/people/not-a-uuid/timeline')
  expect(badPerson.status()).toBe(400)
  expectErrorEnvelope(await badPerson.json(), 'VALIDATION_ERROR')

  const badEvent = await request.get(
    `/api/v1/people/${personId}/timeline/not-a-uuid`,
  )
  expect(badEvent.status()).toBe(400)
  expectErrorEnvelope(await badEvent.json(), 'VALIDATION_ERROR')
})

test('timeline note create validates the body before authorization', async ({
  request,
}) => {
  const invalid = await request.post(`/api/v1/people/${personId}/timeline`, {
    headers: { Origin: origin },
    data: { occurredAt: 'не дата', title: '', unknown: true },
  })
  expect(invalid.status()).toBe(400)
  const invalidBody = await invalid.json()
  expectErrorEnvelope(invalidBody, 'VALIDATION_ERROR')
  expect(invalidBody.error.fields.title).toBeTruthy()
  expect(invalidBody.error.fields.occurredAt).toBeTruthy()

  const badEpisode = await request.post(`/api/v1/people/${personId}/timeline`, {
    headers: { Origin: origin },
    data: {
      occurredAt: '2026-02-01T00:00:00Z',
      title: 'Синтетическая заметка',
      episodeId: 'not-a-uuid',
    },
  })
  expect(badEpisode.status()).toBe(400)
  const badEpisodeBody = await badEpisode.json()
  expectErrorEnvelope(badEpisodeBody, 'VALIDATION_ERROR')
  expect(badEpisodeBody.error.fields.episodeId).toBeTruthy()
})

test('timeline note update validates the payload', async ({ request }) => {
  const invalid = await request.patch(
    `/api/v1/people/${personId}/timeline/${eventId}`,
    {
      headers: { Origin: origin },
      data: { title: '', bogus: 1 },
    },
  )
  expect(invalid.status()).toBe(400)
  const invalidBody = await invalid.json()
  expectErrorEnvelope(invalidBody, 'VALIDATION_ERROR')
  expect(invalidBody.error.fields.title).toBeTruthy()

  const empty = await request.patch(
    `/api/v1/people/${personId}/timeline/${eventId}`,
    {
      headers: { Origin: origin },
      data: {},
    },
  )
  expect(empty.status()).toBe(400)
  expectErrorEnvelope(await empty.json(), 'VALIDATION_ERROR')
})

test('timeline list requires authentication', async ({ request }) => {
  const response = await request.get(`/api/v1/people/${personId}/timeline`)
  expect(response.status()).toBe(401)
  expectErrorEnvelope(await response.json(), 'UNAUTHENTICATED')
})

// Отложенные сценарии (требуют disposable Supabase-проекта и реальной
// учётной записи): создание заметки и чтение события через браузерный
// сценарий с cookie-сессией, RLS-проверка между двумя семьями, 409 на
// редактирование авто-событий, выполнение миграции 0003 и атомарность
// create_episode/complete_episode. Отмечены pending согласно README
// (раздел «Реализованный объём и проверки»).
