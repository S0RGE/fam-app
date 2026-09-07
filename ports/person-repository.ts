import type { Person, PersonStatus } from '../domain/person'

export interface PersonRepository {
  list(
    familyId: string,
    input: { limit: number; offset: number; status?: PersonStatus },
  ): Promise<{ people: Person[]; total: number }>
  create(
    familyId: string,
    input: Omit<
      Person,
      'id' | 'familyId' | 'status' | 'createdAt' | 'updatedAt'
    >,
  ): Promise<Person>
  get(familyId: string, personId: string): Promise<Person | null>
  update(
    familyId: string,
    personId: string,
    input: Omit<
      Person,
      'id' | 'familyId' | 'status' | 'createdAt' | 'updatedAt'
    >,
  ): Promise<Person | null>
  setStatus(
    familyId: string,
    personId: string,
    status: PersonStatus,
  ): Promise<Person | null>
}
