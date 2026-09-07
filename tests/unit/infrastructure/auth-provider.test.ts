import { describe, expect, it } from 'vitest'
import { SupabaseAuthProvider } from '../../../infrastructure/supabase/auth-provider'
describe('SupabaseAuthProvider', () => {
  it('maps provider 429 without exposing an account', async () => {
    const provider = new SupabaseAuthProvider({
      auth: {
        signInWithPassword: async () => ({ error: { status: 429 } }),
        resetPasswordForEmail: async () => ({ error: { status: 429 } }),
      },
    })
    await expect(provider.signIn('a@example.test', 'x')).resolves.toBe(
      'rate_limited',
    )
    await expect(
      provider.requestRecovery('a@example.test', 'https://app.test/callback'),
    ).resolves.toBe('rate_limited')
  })
  it('keeps provider recovery outcome uniform', async () => {
    const provider = new SupabaseAuthProvider({
      auth: { resetPasswordForEmail: async () => ({ error: { status: 400 } }) },
    })
    await expect(
      provider.requestRecovery(
        'missing@example.test',
        'https://app.test/callback',
      ),
    ).resolves.toBe('accepted')
  })
})
