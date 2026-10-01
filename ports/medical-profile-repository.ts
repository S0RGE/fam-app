import type { MedicalProfile } from '../domain/medical-profile'

export interface MedicalProfileRepository {
  get(familyId: string, personId: string): Promise<MedicalProfile | null>
  put(
    familyId: string,
    personId: string,
    profile: Omit<
      MedicalProfile,
      'id' | 'familyId' | 'personId' | 'createdAt' | 'updatedAt'
    >,
  ): Promise<MedicalProfile>
}
