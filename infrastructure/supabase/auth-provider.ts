/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AuthProvider } from '../../ports/auth-provider'
export class SupabaseAuthProvider implements AuthProvider {
  constructor(private readonly client: any) {}
  async getAccount() {
    const { data, error } = await this.client.auth.getClaims()
    const id = data?.claims?.sub
    return error || typeof id !== 'string'
      ? null
      : {
          id,
          email:
            typeof data.claims.email === 'string' ? data.claims.email : null,
        }
  }
  async signIn(email: string, password: string) {
    const { error } = await this.client.auth.signInWithPassword({
      email,
      password,
    })
    return error?.status === 429 ? 'rate_limited' : error ? 'invalid' : 'ok'
  }
  async signOut() {
    await this.client.auth.signOut()
  }
  async requestRecovery(email: string, redirectTo: string) {
    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo,
    })
    return error?.status === 429 ? 'rate_limited' : 'accepted'
  }
  async resetPassword(password: string) {
    const { error } = await this.client.auth.updateUser({ password })
    if (error) throw error
  }
}
