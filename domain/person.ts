import type { FamilyId, PersonId } from './shared'

export type Sex = 'male' | 'female' | 'unspecified'
export type PersonStatus = 'active' | 'archived'

export interface Person {
  id: PersonId
  familyId: FamilyId
  firstName: string
  lastName: string
  middleName: string | null
  birthDate: string
  sex: Sex
  familyRole: string | null
  status: PersonStatus
  createdAt: string
  updatedAt: string
}
