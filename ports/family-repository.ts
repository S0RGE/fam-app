import type { Family } from '../domain/family'

export interface FamilyRepository {
  getForAccount(accountId: string): Promise<Family | null>
  setup(accountId: string, name: string): Promise<Family | 'already_configured'>
}
