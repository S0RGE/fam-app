import { describe, expect, it } from 'vitest'
import { isAllowedOrigin } from '../../../../server/utils/csrf'
describe('origin protection', () => {
  it('requires exact configured origin for login, recovery, logout and protected mutations', () => {
    for (const endpoint of [
      'login',
      'recovery',
      'logout',
      'family',
      'people',
      'profile',
    ]) {
      expect(
        isAllowedOrigin('https://app.test', 'https://app.test'),
        endpoint,
      ).toBe(true)
      expect(isAllowedOrigin(undefined, 'https://app.test'), endpoint).toBe(
        false,
      )
      expect(
        isAllowedOrigin('https://evil.test', 'https://app.test'),
        endpoint,
      ).toBe(false)
    }
  })
})
