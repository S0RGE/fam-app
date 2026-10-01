import { describe, expect, it } from 'vitest'
import type { Measurement } from '../../../domain/measurement'
import type { MeasurementType } from '../../../domain/measurement-type'
import type { MeasurementRepository } from '../../../ports/measurement-repository'
import type { MeasurementTypeRepository } from '../../../ports/measurement-type-repository'
import {
  MeasurementService,
  MeasurementTypeNotFoundError,
  MeasurementValueConflictError,
} from '../../../application/measurements/measurement-service'
import {
  MeasurementTypeService,
  PresetNotEditableError,
} from '../../../application/measurements/measurement-type-service'

const typeRow: MeasurementType = {
  id: 'type-id',
  familyId: 'family-a',
  name: 'Температура',
  category: 'Предустановленные показатели',
  description: null,
  valueType: 'number',
  unit: '°C',
  allowedUnits: ['°F'],
  status: 'active',
  isPreset: false,
  createdAt: 'c',
  updatedAt: 'u',
}

const measurementRow: Measurement = {
  id: 'measurement-id',
  familyId: 'family-a',
  personId: 'person-a',
  measurementTypeId: 'type-id',
  episodeId: null,
  occurredAt: '2026-01-02T00:00:00.000Z',
  numericValue: 36.6,
  textValue: null,
  booleanValue: null,
  compoundValue: null,
  unit: '°C',
  comment: null,
  source: 'manual',
  createdAt: 'c',
  updatedAt: 'u',
}

function makeTypeRepository(rows: MeasurementType[] = [typeRow]) {
  const calls: { name: string; args: unknown[] }[] = []
  const repository: MeasurementTypeRepository = {
    list: async (familyId, input) => {
      calls.push({ name: 'list', args: [familyId, input] })
      return { types: rows, total: rows.length }
    },
    get: async (familyId, typeId) => {
      calls.push({ name: 'get', args: [familyId, typeId] })
      return rows.find((row) => row.id === typeId) ?? null
    },
    create: async (familyId, input) => {
      calls.push({ name: 'create', args: [familyId, input] })
      return { ...typeRow, ...input, familyId }
    },
    update: async (familyId, typeId, input) => {
      calls.push({ name: 'update', args: [familyId, typeId, input] })
      const current = rows.find((row) => row.id === typeId)
      return current ? { ...current, ...input } : null
    },
    archive: async (familyId, typeId, status) => {
      calls.push({ name: 'archive', args: [familyId, typeId, status] })
      const current = rows.find((row) => row.id === typeId)
      return current ? { ...current, status } : null
    },
  }
  return { repository, calls }
}

function makeMeasurementRepository(rows: Measurement[] = [measurementRow]) {
  const calls: { name: string; args: unknown[] }[] = []
  const repository: MeasurementRepository = {
    list: async (familyId, personId, input) => {
      calls.push({ name: 'list', args: [familyId, personId, input] })
      return { measurements: rows, total: rows.length }
    },
    get: async (familyId, personId, id) => {
      calls.push({ name: 'get', args: [familyId, personId, id] })
      return rows.find((row) => row.id === id) ?? null
    },
    create: async (familyId, personId, input) => {
      calls.push({ name: 'create', args: [familyId, personId, input] })
      return { ...measurementRow, ...input, familyId, personId }
    },
    update: async (familyId, personId, id, input) => {
      calls.push({ name: 'update', args: [familyId, personId, id, input] })
      const current = rows.find((row) => row.id === id)
      return current ? { ...current, ...input } : null
    },
    delete: async (familyId, personId, id) => {
      calls.push({ name: 'delete', args: [familyId, personId, id] })
      return rows.some((row) => row.id === id)
    },
  }
  return { repository, calls }
}

describe('MeasurementTypeService', () => {
  it('maps family-scoped list/create/update results without familyId', async () => {
    const { repository, calls } = makeTypeRepository()
    const service = new MeasurementTypeService(repository)
    const listed = await service.list('family-a', { limit: 20, offset: 0 })
    expect(listed.types[0]).not.toHaveProperty('familyId')
    await service.create('family-a', {
      name: 'Глюкоза',
      category: 'Анализы',
      description: null,
      valueType: 'number',
      unit: 'ммоль/л',
      allowedUnits: [],
    })
    await service.update('family-a', 'type-id', { status: 'archived' })
    expect(calls.find((call) => call.name === 'update')?.args).toEqual([
      'family-a',
      'type-id',
      { status: 'archived' },
    ])
  })

  it('rejects all mutations of presets and returns null for missing types', async () => {
    const preset = { ...typeRow, isPreset: true }
    const { repository, calls } = makeTypeRepository([preset])
    const service = new MeasurementTypeService(repository)
    await expect(
      service.update('family-a', 'type-id', { name: 'Иное' }),
    ).rejects.toThrow(PresetNotEditableError)
    expect(calls.some((call) => call.name === 'update')).toBe(false)
    await expect(
      service.update('family-a', 'missing', { name: 'Иное' }),
    ).resolves.toBeNull()
  })
})

describe('MeasurementService', () => {
  it('creates a manual measurement with an exact value', async () => {
    const { repository: measurements, calls } = makeMeasurementRepository()
    const { repository: types } = makeTypeRepository()
    const service = new MeasurementService(measurements, types)
    const result = await service.create('family-a', 'person-a', {
      measurementTypeId: 'type-id',
      occurredAt: '2026-01-02T00:00:00.000Z',
      numericValue: 36.7,
      unit: '°F',
    })
    expect(calls.find((call) => call.name === 'create')?.args).toEqual([
      'family-a',
      'person-a',
      {
        measurementTypeId: 'type-id',
        occurredAt: '2026-01-02T00:00:00.000Z',
        numericValue: 36.7,
        textValue: null,
        booleanValue: null,
        compoundValue: null,
        unit: '°F',
        comment: null,
        episodeId: null,
        source: 'manual',
      },
    ])
    expect(result).not.toHaveProperty('familyId')
    expect(result).not.toHaveProperty('personId')
  })

  it('rejects missing/archived types, mismatched values and invalid units', async () => {
    const { repository: measurements } = makeMeasurementRepository()
    const missing = new MeasurementService(
      measurements,
      makeTypeRepository([]).repository,
    )
    await expect(
      missing.create('family-a', 'person-a', {
        measurementTypeId: 'missing',
        occurredAt: '2026-01-02T00:00:00.000Z',
        numericValue: 1,
      }),
    ).rejects.toThrow(MeasurementTypeNotFoundError)

    const service = new MeasurementService(
      measurements,
      makeTypeRepository().repository,
    )
    await expect(
      service.create('family-a', 'person-a', {
        measurementTypeId: 'type-id',
        occurredAt: '2026-01-02T00:00:00.000Z',
        textValue: 'не число',
      }),
    ).rejects.toThrow(MeasurementValueConflictError)
    await expect(
      service.create('family-a', 'person-a', {
        measurementTypeId: 'type-id',
        occurredAt: '2026-01-02T00:00:00.000Z',
        numericValue: 1,
        unit: 'кг',
      }),
    ).rejects.toThrow('Единица измерения не поддерживается')
  })

  it('validates projected values before scoped update and forwards delete', async () => {
    const { repository: measurements, calls } = makeMeasurementRepository()
    const service = new MeasurementService(
      measurements,
      makeTypeRepository().repository,
    )
    await expect(
      service.update('family-a', 'person-a', 'measurement-id', {
        numericValue: 37,
        comment: 'После сна',
      }),
    ).resolves.toMatchObject({ numericValue: 37, comment: 'После сна' })
    await expect(
      service.update('family-a', 'person-a', 'measurement-id', {
        numericValue: null,
        textValue: 'ошибка',
      }),
    ).rejects.toThrow(MeasurementValueConflictError)
    await expect(
      service.delete('family-a', 'person-a', 'measurement-id'),
    ).resolves.toBe(true)
    expect(calls.find((call) => call.name === 'delete')?.args).toEqual([
      'family-a',
      'person-a',
      'measurement-id',
    ])
  })
})
