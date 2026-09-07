import { expect, test } from '@playwright/test'

test('public health endpoint returns its exact DTO', async ({ request }) => {
  const response = await request.get('/api/v1/health')

  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('application/json')
  await expect(response.json()).resolves.toEqual({ data: { status: 'ok' } })
})
