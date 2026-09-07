import { describe, expect, it } from 'vitest'
import { createFamilySchema } from '../../../application/dto/family'
import {
  personSchema,
  peopleQuerySchema,
} from '../../../application/dto/people'
import { medicalProfileSchema } from '../../../application/dto/medical-profile'
describe('auth and family schemas', () => {
  it('enforces family and person limits', () => {
    expect(createFamilySchema.safeParse({ name: ' ' }).success).toBe(false)
    expect(
      createFamilySchema.safeParse({ name: 'Семья', familyId: 'forbidden' })
        .success,
    ).toBe(false)
    expect(
      personSchema.safeParse({
        firstName: 'Иван',
        lastName: 'Иванов',
        birthDate: '2999-01-01',
        sex: 'male',
      }).success,
    ).toBe(false)
  })
  it('uses approved people pagination', () => {
    expect(peopleQuerySchema.parse({})).toMatchObject({ limit: 20, offset: 0 })
    expect(peopleQuerySchema.safeParse({ limit: 101 }).success).toBe(false)
    expect(peopleQuerySchema.safeParse({ offset: -1 }).success).toBe(false)
  })
  it('rejects oversized medical profile categories', () => {
    const item = { name: 'Аллергия', description: null, status: 'active' }
    expect(
      medicalProfileSchema.safeParse({
        bloodGroup: null,
        rhesusFactor: null,
        generalComment: null,
        allergies: Array.from({ length: 101 }, () => item),
        chronicConditions: [],
        warnings: [],
      }).success,
    ).toBe(false)
  })
})
