import { expect, test } from '@playwright/test'

const origin = 'http://127.0.0.1:4173'
const attacker = 'https://attacker.example'
const personId = '11111111-1111-4111-8111-111111111111'
const typeId = '22222222-2222-4222-8222-222222222222'
const measurementId = '33333333-3333-4333-8333-333333333333'

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

test('all measurement mutations enforce same-origin requests', async ({
  request,
}) => {
  const responses = [
    await request.post('/api/v1/measurements/types', {
      data: { name: 'Вес', category: 'Основные', valueType: 'number' },
    }),
    await request.patch(`/api/v1/measurements/types/${typeId}`, {
      headers: { Origin: attacker },
      data: { name: 'Вес' },
    }),
    await request.post(`/api/v1/people/${personId}/measurements`, {
      data: {
        measurementTypeId: typeId,
        occurredAt: '2026-01-01T00:00:00Z',
        numericValue: 70,
      },
    }),
    await request.patch(
      `/api/v1/people/${personId}/measurements/${measurementId}`,
      {
        headers: { Origin: attacker },
        data: { numericValue: 71 },
      },
    ),
    await request.delete(
      `/api/v1/people/${personId}/measurements/${measurementId}`,
    ),
  ]
  for (const response of responses) {
    expect(response.status()).toBe(403)
    expectErrorEnvelope(await response.json(), 'ORIGIN_FORBIDDEN')
  }
})

test('measurement lists enforce strict query validation', async ({
  request,
}) => {
  for (const path of [
    '/api/v1/measurements/types?name=a&name=b',
    `/api/v1/people/${personId}/measurements?from=2026-01-01T00:00:00Z&from=2026-02-01T00:00:00Z`,
    `/api/v1/people/${personId}/measurements?unknown=1`,
  ]) {
    const response = await request.get(path)
    expect(response.status()).toBe(400)
    expectErrorEnvelope(await response.json(), 'VALIDATION_ERROR', {
      query: 'Недопустимые параметры',
    })
  }
})

test('measurement routes validate identifiers and bodies before authorization', async ({
  request,
}) => {
  const badPerson = await request.get('/api/v1/people/not-a-uuid/measurements')
  expect(badPerson.status()).toBe(400)
  expectErrorEnvelope(await badPerson.json(), 'VALIDATION_ERROR')

  const badTypeId = await request.patch(
    '/api/v1/measurements/types/not-a-uuid',
    {
      headers: { Origin: origin },
      data: { name: 'Вес' },
    },
  )
  expect(badTypeId.status()).toBe(400)
  expectErrorEnvelope(await badTypeId.json(), 'VALIDATION_ERROR')

  const typeBody = await request.post('/api/v1/measurements/types', {
    headers: { Origin: origin },
    data: {
      name: 'Фото',
      category: 'Прочее',
      valueType: 'image',
      familyId: crypto.randomUUID(),
    },
  })
  expect(typeBody.status()).toBe(400)
  const typeError = await typeBody.json()
  expectErrorEnvelope(typeError, 'VALIDATION_ERROR')
  expect(typeError.error.fields.valueType).toBeTruthy()

  const measurementBody = await request.post(
    `/api/v1/people/${personId}/measurements`,
    {
      headers: { Origin: origin },
      data: {
        measurementTypeId: typeId,
        occurredAt: 'не дата',
        compoundValue: { systolic: 0, diastolic: 80, extra: 1 },
      },
    },
  )
  expect(measurementBody.status()).toBe(400)
  const measurementError = await measurementBody.json()
  expectErrorEnvelope(measurementError, 'VALIDATION_ERROR')
  expect(measurementError.error.fields.occurredAt).toBeTruthy()
  expect(measurementError.error.fields.compoundValue).toBeTruthy()

  const noOffset = await request.post(
    `/api/v1/people/${personId}/measurements`,
    {
      headers: { Origin: origin },
      data: {
        measurementTypeId: typeId,
        occurredAt: '2026-02-01T12:00:00',
        numericValue: 70,
      },
    },
  )
  expect(noOffset.status()).toBe(400)
  const noOffsetError = await noOffset.json()
  expectErrorEnvelope(noOffsetError, 'VALIDATION_ERROR')
  expect(noOffsetError.error.fields.occurredAt).toBe(
    'Укажите часовой пояс: Z или смещение',
  )

  const emptyPatch = await request.patch(
    `/api/v1/people/${personId}/measurements/${measurementId}`,
    { headers: { Origin: origin }, data: {} },
  )
  expect(emptyPatch.status()).toBe(400)
  expectErrorEnvelope(await emptyPatch.json(), 'VALIDATION_ERROR')
})

test('measurement lists require authentication', async ({ request }) => {
  for (const path of [
    '/api/v1/measurements/types',
    `/api/v1/people/${personId}/measurements`,
  ]) {
    const response = await request.get(path)
    expect(response.status()).toBe(401)
    expectErrorEnvelope(await response.json(), 'UNAUTHENTICATED')
  }
})

// Live create/update/delete, cross-family RLS, preset immutability and atomic
// measurement+timeline-event verification require disposable Supabase users.
