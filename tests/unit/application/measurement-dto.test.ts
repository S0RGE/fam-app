import { describe, expect, it } from 'vitest'
import {
  measurementTypeCreateSchema,
  measurementTypeQuerySchema,
  measurementTypeUpdateSchema,
} from '../../../application/dto/measurement-type'
import {
  measurementCreateSchema,
  measurementQuerySchema,
  measurementUpdateSchema,
} from '../../../application/dto/measurement'

describe('measurement type DTO validation', () => {
  it('normalizes a custom type and applies list defaults', () => {
    expect(
      measurementTypeCreateSchema.parse({
        name: '  Глюкоза ',
        category: ' Анализы ',
        valueType: 'number',
        unit: ' ммоль/л ',
        allowedUnits: [' мг/дл '],
      }),
    ).toEqual({
      name: 'Глюкоза',
      category: 'Анализы',
      description: null,
      valueType: 'number',
      unit: 'ммоль/л',
      allowedUnits: ['мг/дл'],
    })
    expect(measurementTypeQuerySchema.parse({})).toEqual({
      limit: 20,
      offset: 0,
    })
  })

  it('rejects image, unknown fields and empty updates with Russian errors', () => {
    const image = measurementTypeCreateSchema.safeParse({
      name: 'Фото',
      category: 'Прочее',
      valueType: 'image',
    })
    expect(image.success).toBe(false)
    if (!image.success)
      expect(image.error.issues[0]?.message).toBe('Тип значения недоступен')

    expect(
      measurementTypeCreateSchema.safeParse({
        name: 'Вес',
        category: 'Основные',
        valueType: 'number',
        familyId: crypto.randomUUID(),
      }).success,
    ).toBe(false)
    expect(measurementTypeUpdateSchema.safeParse({}).success).toBe(false)
  })

  it('accepts archive and explicit nullable fields on update', () => {
    expect(
      measurementTypeUpdateSchema.parse({
        status: 'archived',
        description: '',
        unit: null,
      }),
    ).toEqual({ status: 'archived', description: null, unit: null })
  })
})

describe('measurement DTO validation', () => {
  const base = {
    measurementTypeId: '11111111-1111-4111-8111-111111111111',
    occurredAt: '2026-01-02T03:04:05+03:00',
  }

  it.each([
    ['number', { numericValue: 36.6 }],
    ['text', { textValue: '  нормальное ' }],
    ['boolean', { booleanValue: false }],
    ['compound', { compoundValue: { systolic: 120, diastolic: 80 } }],
  ])('accepts the %s value shape', (_name, value) => {
    const parsed = measurementCreateSchema.parse({ ...base, ...value })
    expect(parsed.occurredAt).toBe('2026-01-02T00:04:05.000Z')
    if ('textValue' in value) expect(parsed.textValue).toBe('нормальное')
  })

  it('requires an explicit timezone and normalizes supported offsets to UTC', () => {
    const withoutOffset = measurementCreateSchema.safeParse({
      ...base,
      occurredAt: '2026-01-02T03:04:05',
      numericValue: 36.6,
    })
    expect(withoutOffset.success).toBe(false)
    if (!withoutOffset.success)
      expect(withoutOffset.error.issues[0]?.message).toBe(
        'Укажите часовой пояс: Z или смещение',
      )
    expect(
      measurementQuerySchema.safeParse({ from: '2026-01-02T03:04:05' }).success,
    ).toBe(false)
    expect(
      measurementQuerySchema.parse({ to: '2026-01-02T03:04:05Z' }).to,
    ).toBe('2026-01-02T03:04:05.000Z')
  })

  it('rejects non-finite and malformed values, unknown fields and image-era payloads', () => {
    expect(
      measurementCreateSchema.safeParse({
        ...base,
        numericValue: Number.POSITIVE_INFINITY,
      }).success,
    ).toBe(false)
    expect(
      measurementCreateSchema.safeParse({
        ...base,
        compoundValue: { systolic: 0, diastolic: 80, extra: 1 },
      }).success,
    ).toBe(false)
    expect(
      measurementCreateSchema.safeParse({
        ...base,
        numericValue: 1,
        source: 'import',
      }).success,
    ).toBe(false)
  })

  it('enforces strict list and non-empty update contracts', () => {
    expect(measurementQuerySchema.safeParse({ unknown: '1' }).success).toBe(
      false,
    )
    expect(measurementUpdateSchema.safeParse({}).success).toBe(false)
    expect(
      measurementUpdateSchema.parse({ booleanValue: false, comment: '' }),
    ).toEqual({ booleanValue: false, comment: null })
  })
})
