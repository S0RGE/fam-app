/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Person } from '../../domain/person'
import type { PersonRepository } from '../../ports/person-repository'
import type { PersonDto } from '../dto/people'
export const personDto = (p: Person): PersonDto => ({
  id: p.id,
  firstName: p.firstName,
  lastName: p.lastName,
  middleName: p.middleName,
  birthDate: p.birthDate,
  sex: p.sex,
  familyRole: p.familyRole,
  status: p.status,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
})
export class PeopleService {
  constructor(private readonly people: PersonRepository) {}
  list(f: string, input: any) {
    return this.people
      .list(f, input)
      .then((x) => ({ people: x.people.map(personDto), total: x.total }))
  }
  async get(f: string, id: string) {
    const p = await this.people.get(f, id)
    return p && personDto(p)
  }
  create(f: string, input: any) {
    return this.people.create(f, input).then(personDto)
  }
  update(f: string, id: string, input: any) {
    return this.people.update(f, id, input).then((p) => p && personDto(p))
  }
  transition(f: string, id: string, status: 'active' | 'archived') {
    return this.people.setStatus(f, id, status).then((p) => p && personDto(p))
  }
}
