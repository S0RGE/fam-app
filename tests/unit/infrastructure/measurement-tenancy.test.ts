import { describe, expect, it } from 'vitest'
import { SupabaseMeasurementTypeRepository } from '../../../infrastructure/supabase/measurement-type-repository'
import { SupabaseMeasurementRepository } from '../../../infrastructure/supabase/measurement-repository'

interface Chain {
  select(_columns?: string, _options?: unknown): Chain
  insert(payload: unknown): Chain
  update(payload: unknown): Chain
  eq(field: string, value: unknown): Chain
  ilike(field: string, value: string): Chain
  order(): Chain
  range(): Chain
  gte(field: string, value: string): Chain
  lte(field: string, value: string): Chain
  maybeSingle(): Promise<{ data: unknown; error: null }>
  single(): Promise<{ data: unknown; error: null }>
  then(onfulfilled?: (value: unknown) => unknown): Promise<unknown>
}

function makeChain(data: unknown, count: number | null = null) {
  const filters: Array<[string, unknown]> = []
  const inserted: unknown[] = []
  const updated: unknown[] = []
  const result = { data, error: null, count }
  const chain: Chain = {
    select: () => chain,
    insert: (payload: unknown) => {
      inserted.push(payload)
      return chain
    },
    update: (payload: unknown) => {
      updated.push(payload)
      return chain
    },
    eq: (field: string, value: unknown) => {
      filters.push([field, value])
      return chain
    },
    ilike: (field: string, value: string) => {
      filters.push([field, value])
      return chain
    },
    order: () => chain,
    range: () => chain,
    gte: (field: string, value: string) => {
      filters.push([field, value])
      return chain
    },
    lte: (field: string, value: string) => {
      filters.push([field, value])
      return chain
    },
    maybeSingle: async () => ({ data, error: null }),
    single: async () => ({ data, error: null }),
    then: (onfulfilled?: (value: unknown) => unknown) => {
      const value = onfulfilled ? onfulfilled({ ...result }) : { ...result }
      return new Promise((resolve) => resolve(value))
    },
  }
  return { chain, filters, inserted, updated }
}

const typeRow = {
  id: 'type-id',
  family_id: 'family-a',
  name: 'Температура',
  category: 'Предустановленные показатели',
  description: null,
  value_type: 'number',
  unit: '°C',
  allowed_units: [],
  status: 'active',
  is_preset: true,
  created_at: 'c',
  updated_at: 'u',
}

const measurementRow = {
  id: 'measurement-id',
  family_id: 'family-a',
  person_id: 'person-b',
  measurement_type_id: 'type-id',
  episode_id: null,
  occurred_at: '2026-01-02T00:00:00Z',
  numeric_value: 36.6,
  text_value: null,
  boolean_value: null,
  compound_value: null,
  unit: '°C',
  comment: null,
  source: 'manual',
  created_at: 'c',
  updated_at: 'u',
}

describe('SupabaseMeasurementTypeRepository tenant boundaries', () => {
  it('scopes lookup by family and type identifiers', async () => {
    const { chain, filters } = makeChain(null)
    const repository = new SupabaseMeasurementTypeRepository({
      from: (table: string) => {
        expect(table).toBe('measurement_types')
        return chain
      },
    } as never)

    await expect(repository.get('family-a', 'type-id')).resolves.toBeNull()
    expect(filters).toEqual([
      ['family_id', 'family-a'],
      ['id', 'type-id'],
    ])
  })

  it('maps rows and filters type lists by family and name', async () => {
    const { chain, filters } = makeChain([typeRow], 1)
    const repository = new SupabaseMeasurementTypeRepository({
      from: () => chain,
    } as never)

    const result = await repository.list('family-a', {
      limit: 20,
      offset: 0,
      name: 'темп',
    })
    expect(result.total).toBe(1)
    expect(result.types[0]).toMatchObject({
      id: 'type-id',
      familyId: 'family-a',
      valueType: 'number',
      isPreset: true,
    })
    expect(filters).toContainEqual(['family_id', 'family-a'])
    expect(filters).toContainEqual(['name', '%темп%'])
  })

  it('prevents repository updates to preset rows and other families', async () => {
    const { chain, filters, updated } = makeChain(null)
    const repository = new SupabaseMeasurementTypeRepository({
      from: () => chain,
    } as never)

    await repository.update('family-a', 'type-id', { name: 'Новое имя' })
    expect(updated).toHaveLength(1)
    expect(updated[0]).toMatchObject({ name: 'Новое имя' })
    expect(updated[0]).toHaveProperty('updated_at')
    expect(filters).toEqual([
      ['family_id', 'family-a'],
      ['id', 'type-id'],
      ['is_preset', false],
    ])
  })
})

describe('SupabaseMeasurementRepository tenant boundaries', () => {
  it('scopes lookup by family, person and measurement identifiers', async () => {
    const { chain, filters } = makeChain(null)
    const repository = new SupabaseMeasurementRepository({
      from: (table: string) => {
        expect(table).toBe('measurements')
        return chain
      },
    } as never)

    await expect(
      repository.get('family-a', 'person-b', 'measurement-id'),
    ).resolves.toBeNull()
    expect(filters).toEqual([
      ['family_id', 'family-a'],
      ['person_id', 'person-b'],
      ['id', 'measurement-id'],
    ])
  })

  it('creates measurement and timeline event through one RPC', async () => {
    let rpcName = ''
    let rpcArgs: unknown
    const repository = new SupabaseMeasurementRepository({
      rpc: (name: string, args: unknown) => {
        rpcName = name
        rpcArgs = args
        return Promise.resolve({ data: measurementRow, error: null })
      },
    } as never)

    const result = await repository.create('family-a', 'person-b', {
      measurementTypeId: 'type-id',
      episodeId: null,
      occurredAt: '2026-01-02T00:00:00Z',
      numericValue: 36.6,
      textValue: null,
      booleanValue: null,
      compoundValue: null,
      unit: '°C',
      comment: null,
      source: 'manual',
    })

    expect(result.id).toBe('measurement-id')
    expect(rpcName).toBe('create_measurement')
    expect(rpcArgs).toEqual({
      p_family_id: 'family-a',
      p_person_id: 'person-b',
      p_measurement: {
        measurementTypeId: 'type-id',
        episodeId: null,
        occurredAt: '2026-01-02T00:00:00Z',
        numericValue: 36.6,
        textValue: null,
        booleanValue: null,
        compoundValue: null,
        unit: '°C',
        comment: null,
        source: 'manual',
      },
    })
  })

  it('updates and deletes only through scoped atomic RPCs', async () => {
    const calls: Array<[string, unknown]> = []
    const repository = new SupabaseMeasurementRepository({
      rpc: (name: string, args: unknown) => {
        calls.push([name, args])
        return Promise.resolve({
          data:
            name === 'delete_measurement' ? 'measurement-id' : measurementRow,
          error: null,
        })
      },
    } as never)

    await repository.update('family-a', 'person-b', 'measurement-id', {
      numericValue: 37.1,
      comment: null,
    })
    await expect(
      repository.delete('family-a', 'person-b', 'measurement-id'),
    ).resolves.toBe(true)

    expect(calls).toEqual([
      [
        'update_measurement',
        {
          p_family_id: 'family-a',
          p_person_id: 'person-b',
          p_measurement_id: 'measurement-id',
          p_changes: { numericValue: 37.1, comment: null },
        },
      ],
      [
        'delete_measurement',
        {
          p_family_id: 'family-a',
          p_person_id: 'person-b',
          p_measurement_id: 'measurement-id',
        },
      ],
    ])
  })
})
