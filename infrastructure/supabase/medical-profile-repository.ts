/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MedicalProfileRepository } from '../../ports/medical-profile-repository'
const map = (r: any) => ({
  id: r.id,
  familyId: r.family_id,
  personId: r.person_id,
  bloodGroup: r.blood_group,
  rhesusFactor: r.rhesus_factor,
  generalComment: r.general_comment,
  items: (r.medical_profile_items || []).map((i: any) => ({
    id: i.id,
    category: i.category,
    name: i.name,
    description: i.description,
    status: i.status,
    createdAt: i.created_at,
    updatedAt: i.updated_at,
  })),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})
export class SupabaseMedicalProfileRepository implements MedicalProfileRepository {
  constructor(private readonly client: any) {}
  async get(familyId: string, personId: string) {
    const { data, error } = await this.client
      .from('medical_profiles')
      .select('*,medical_profile_items(*)')
      .eq('family_id', familyId)
      .eq('person_id', personId)
      .maybeSingle()
    if (error) throw error
    return data ? map(data) : null
  }
  async put(familyId: string, personId: string, profile: any) {
    const { error } = await this.client.rpc('put_medical_profile', {
      p_family_id: familyId,
      p_person_id: personId,
      p_profile: profile,
    })
    if (error) throw error
    const result = await this.get(familyId, personId)
    if (!result) throw new Error('Profile was not returned')
    return result
  }
}
