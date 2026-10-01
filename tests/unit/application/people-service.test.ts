import { describe, expect, it } from 'vitest'
import { PeopleService } from '../../../application/people/people-service'
import type { PersonRepository } from '../../../ports/person-repository'
const person = {
  id: '11111111-1111-4111-8111-111111111111',
  familyId: 'family',
  firstName: 'Иван',
  lastName: 'Иванов',
  middleName: null,
  birthDate: '2010-01-02',
  sex: 'male' as const,
  familyRole: null,
  status: 'active' as const,
  createdAt: 'now',
  updatedAt: 'now',
}
const repository: PersonRepository = {
  list: async () => ({ people: [person], total: 1 }),
  create: async () => person,
  get: async () => person,
  update: async () => person,
  setStatus: async (_f, _id, status) => ({ ...person, status }),
}
describe('PeopleService', () => {
  it('maps pagination and idempotent archive/restore transitions', async () => {
    const service = new PeopleService(repository)
    await expect(
      service.list('family', { limit: 20, offset: 0 }),
    ).resolves.toMatchObject({ total: 1, people: [{ id: person.id }] })
    await expect(
      service.transition('family', person.id, 'archived'),
    ).resolves.toMatchObject({ status: 'archived' })
    await expect(
      service.transition('family', person.id, 'active'),
    ).resolves.toMatchObject({ status: 'active' })
  })
})
