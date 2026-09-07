/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FamilyRepository } from '../../ports/family-repository'

const family = (row: any) => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})
export class SupabaseFamilyRepository implements FamilyRepository {
  constructor(private readonly client: any) {}
  async getForAccount(accountId: string) {
    const { data, error } = await this.client
      .from('family_accounts')
      .select('families(id,name,created_at,updated_at)')
      .eq('account_id', accountId)
      .maybeSingle()
    if (error) throw error
    return data?.families ? family(data.families) : null
  }
  async setup(_accountId: string, name: string) {
    const { data, error } = await this.client.rpc('setup_family', {
      p_name: name,
    })
    if (error) {
      if (error.code === '23505') return 'already_configured'
      throw error
    }
    return family(data)
  }
}
