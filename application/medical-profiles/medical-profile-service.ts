/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MedicalProfile } from '../../domain/medical-profile'
import type { MedicalProfileRepository } from '../../ports/medical-profile-repository'
const dto = (p: MedicalProfile) => ({
  id: p.id,
  bloodGroup: p.bloodGroup,
  rhesusFactor: p.rhesusFactor,
  generalComment: p.generalComment,
  allergies: p.items.filter((i) => i.category === 'allergy'),
  chronicConditions: p.items.filter((i) => i.category === 'chronic_condition'),
  warnings: p.items.filter((i) => i.category === 'warning'),
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
})
export class MedicalProfileService {
  constructor(private readonly profiles: MedicalProfileRepository) {}
  async get(f: string, p: string) {
    const value = await this.profiles.get(f, p)
    return value && dto(value)
  }
  put(f: string, p: string, input: any) {
    return this.profiles
      .put(f, p, {
        bloodGroup: input.bloodGroup,
        rhesusFactor: input.rhesusFactor,
        generalComment: input.generalComment,
        items: [
          ...input.allergies.map((x: any) => ({ ...x, category: 'allergy' })),
          ...input.chronicConditions.map((x: any) => ({
            ...x,
            category: 'chronic_condition',
          })),
          ...input.warnings.map((x: any) => ({ ...x, category: 'warning' })),
        ],
      })
      .then(dto)
  }
}
