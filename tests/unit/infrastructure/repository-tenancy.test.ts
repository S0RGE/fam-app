import { describe, expect, it } from 'vitest'
import { SupabaseMedicalProfileRepository } from '../../../infrastructure/supabase/medical-profile-repository'
import { SupabasePersonRepository } from '../../../infrastructure/supabase/person-repository'

function maybeSingleQuery(result: unknown = null) {
  const filters: Array<[string, unknown]> = []
  const chain = {
    select: () => chain,
    eq: (field: string, value: unknown) => {
      filters.push([field, value])
      return chain
    },
    maybeSingle: async () => ({ data: result, error: null }),
  }
  return { chain, filters }
}

describe('Supabase repository tenant boundaries', () => {
  it('scopes a person lookup by family and person identifiers', async () => {
    const query = maybeSingleQuery()
    const repository = new SupabasePersonRepository({
      from: (table: string) => {
        expect(table).toBe('people')
        return query.chain
      },
    })

    await expect(repository.get('family-a', 'person-b')).resolves.toBeNull()
    expect(query.filters).toEqual([
      ['family_id', 'family-a'],
      ['id', 'person-b'],
    ])
  })

  it('scopes a medical-profile lookup by family and person identifiers', async () => {
    const query = maybeSingleQuery()
    const repository = new SupabaseMedicalProfileRepository({
      from: (table: string) => {
        expect(table).toBe('medical_profiles')
        return query.chain
      },
    })

    await expect(repository.get('family-a', 'person-b')).resolves.toBeNull()
    expect(query.filters).toEqual([
      ['family_id', 'family-a'],
      ['person_id', 'person-b'],
    ])
  })
})
