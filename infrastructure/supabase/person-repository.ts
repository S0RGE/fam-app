/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PersonRepository } from '../../ports/person-repository'
const map = (r: any) => ({
  id: r.id,
  familyId: r.family_id,
  firstName: r.first_name,
  lastName: r.last_name,
  middleName: r.middle_name,
  birthDate: r.birth_date,
  sex: r.sex,
  familyRole: r.family_role,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})
export class SupabasePersonRepository implements PersonRepository {
  constructor(private readonly client: any) {}
  async list(familyId: string, input: any) {
    let q = this.client
      .from('people')
      .select('*', { count: 'exact' })
      .eq('family_id', familyId)
      .order('created_at')
      .order('id')
      .range(input.offset, input.offset + input.limit - 1)
    if (input.status) q = q.eq('status', input.status)
    const { data, error, count } = await q
    if (error) throw error
    return { people: (data || []).map(map), total: count || 0 }
  }
  async create(familyId: string, input: any) {
    const { data, error } = await this.client
      .from('people')
      .insert({
        family_id: familyId,
        first_name: input.firstName,
        last_name: input.lastName,
        middle_name: input.middleName,
        birth_date: input.birthDate,
        sex: input.sex,
        family_role: input.familyRole,
        status: 'active',
      })
      .select()
      .single()
    if (error) throw error
    return map(data)
  }
  async get(familyId: string, id: string) {
    const { data, error } = await this.client
      .from('people')
      .select('*')
      .eq('family_id', familyId)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ? map(data) : null
  }
  async update(f: string, id: string, input: any) {
    const { data, error } = await this.client
      .from('people')
      .update({
        first_name: input.firstName,
        last_name: input.lastName,
        middle_name: input.middleName,
        birth_date: input.birthDate,
        sex: input.sex,
        family_role: input.familyRole,
        updated_at: new Date().toISOString(),
      })
      .eq('family_id', f)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw error
    return data ? map(data) : null
  }
  async setStatus(f: string, id: string, status: any) {
    const { data, error } = await this.client
      .from('people')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('family_id', f)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw error
    return data ? map(data) : null
  }
}
