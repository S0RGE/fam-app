import { expect, test } from '@playwright/test'

const origin = 'http://127.0.0.1:4173'

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

test('mutation endpoints reject missing and cross-site origins', async ({
  request,
}) => {
  const missing = await request.post('/api/v1/auth/login', {
    data: { email: 'test@example.test', password: 'synthetic-password' },
  })
  expect(missing.status()).toBe(403)
  expectErrorEnvelope(await missing.json(), 'ORIGIN_FORBIDDEN')

  const crossSite = await request.post('/api/v1/people', {
    headers: { Origin: 'https://attacker.example' },
    data: {
      firstName: 'Иван',
      lastName: 'Иванов',
      middleName: null,
      birthDate: '2010-01-02',
      sex: 'male',
      familyRole: null,
    },
  })
  expect(crossSite.status()).toBe(403)
  expectErrorEnvelope(await crossSite.json(), 'ORIGIN_FORBIDDEN')
})

test('handlers return strict validation and unauthenticated envelopes', async ({
  request,
}) => {
  const malformed = await request.post('/api/v1/family', {
    headers: { Origin: origin },
    data: { name: '', familyId: 'client-controlled' },
  })
  expect(malformed.status()).toBe(400)
  const malformedBody = await malformed.json()
  expectErrorEnvelope(malformedBody, 'VALIDATION_ERROR')
  expect(malformedBody.error.fields).toBeTruthy()

  const duplicateQuery = await request.get('/api/v1/people?limit=20&limit=30')
  expect(duplicateQuery.status()).toBe(400)
  expectErrorEnvelope(await duplicateQuery.json(), 'VALIDATION_ERROR', {
    query: 'Недопустимые параметры',
  })

  const unauthenticated = await request.get('/api/v1/people?limit=20&offset=0')
  expect(unauthenticated.status()).toBe(401)
  expectErrorEnvelope(await unauthenticated.json(), 'UNAUTHENTICATED')

  const invalidPersonId = await request.put(
    '/api/v1/people/not-a-uuid/medical-profile',
    {
      headers: { Origin: origin },
      data: {
        bloodGroup: null,
        rhesusFactor: null,
        generalComment: null,
        allergies: [],
        chronicConditions: [],
        warnings: [],
      },
    },
  )
  expect(invalidPersonId.status()).toBe(400)
  expectErrorEnvelope(await invalidPersonId.json(), 'VALIDATION_ERROR')
})
