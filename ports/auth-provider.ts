import type { AuthenticatedAccount } from '../domain/auth'

export interface AuthProvider {
  getAccount(): Promise<AuthenticatedAccount | null>
  signIn(
    email: string,
    password: string,
  ): Promise<'ok' | 'invalid' | 'rate_limited'>
  signOut(): Promise<void>
  requestRecovery(
    email: string,
    redirectTo: string,
  ): Promise<'accepted' | 'rate_limited'>
  resetPassword(password: string): Promise<void>
}
