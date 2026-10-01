import type { FamilyId, PersonId } from './shared'

export type MedicalProfileItemCategory =
  'allergy' | 'chronic_condition' | 'warning'
export type MedicalProfileItemStatus = 'active' | 'archived'

export interface MedicalProfileItem {
  id: string
  category: MedicalProfileItemCategory
  name: string
  description: string | null
  status: MedicalProfileItemStatus
  createdAt: string
  updatedAt: string
}

export interface MedicalProfile {
  id: string
  familyId: FamilyId
  personId: PersonId
  bloodGroup: 'o' | 'a' | 'b' | 'ab' | null
  rhesusFactor: 'positive' | 'negative' | null
  generalComment: string | null
  items: MedicalProfileItem[]
  createdAt: string
  updatedAt: string
}
