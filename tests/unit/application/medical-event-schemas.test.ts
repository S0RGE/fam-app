import { describe, expect, it } from 'vitest'
import {
  medicalEventCreateSchema,
  medicalEventQuerySchema,
  medicalEventUpdateSchema,
} from '../../../application/dto/medical-event'

describe('medicalEventQuerySchema', () => {
  it('applies defaults and parses filters with UTC normalization', () => {
    expect(medicalEventQuerySchema.parse({})).toEqual({ limit: 20, offset: 0 })
    const parsed = medicalEventQuerySchema.parse({
      limit: '50',
      offset: '10',
      from: '2026-01-02T03:00:00+03:00',
      to: '2026-02-01T00:00:00Z',
      type: 'episode_start',
      episodeId: '11111111-1111-4111-8111-111111111111',
    })
    expect(parsed).toMatchObject({
      limit: 50,
      offset: 10,
      from: '2026-01-02T00:00:00.000Z',
      to: '2026-02-01T00:00:00.000Z',
      type: 'episode_start',
    })
  })

  it('rejects unknown parameters, bad bounds and bad instants', () => {
    expect(() =>
      medicalEventQuerySchema.parse({ limit: 20, offset: 0, unknown: 1 }),
    ).toThrow()
    expect(() =>
      medicalEventQuerySchema.parse({ limit: 101, offset: 0 }),
    ).toThrow()
    expect(() =>
      medicalEventQuerySchema.parse({ limit: 0, offset: 0 }),
    ).toThrow()
    expect(() =>
      medicalEventQuerySchema.parse({
        limit: 20,
        offset: 0,
        type: 'bogus',
      }),
    ).toThrow()
    expect(() =>
      medicalEventQuerySchema.parse({ limit: 20, offset: 0, from: 'не дата' }),
    ).toThrow()
    expect(() =>
      medicalEventQuerySchema.parse({
        limit: 20,
        offset: 0,
        episodeId: 'not-a-uuid',
      }),
    ).toThrow()
  })
})

describe('medicalEventCreateSchema', () => {
  it('normalizes instants and defaults description/episodeId to null', () => {
    const parsed = medicalEventCreateSchema.parse({
      occurredAt: '2026-01-02T03:00:00+03:00',
      title: 'Заметка',
    })
    expect(parsed).toEqual({
      occurredAt: '2026-01-02T00:00:00.000Z',
      title: 'Заметка',
      description: null,
      episodeId: null,
    })
  })

  it('rejects empty title, non-instant date, extra fields and long text', () => {
    expect(() =>
      medicalEventCreateSchema.parse({
        occurredAt: '2026-01-01T00:00:00Z',
        title: '',
      }),
    ).toThrow()
    expect(() =>
      medicalEventCreateSchema.parse({ occurredAt: 'не дата', title: 'Х' }),
    ).toThrow()
    expect(() =>
      medicalEventCreateSchema.parse({
        occurredAt: '2026-01-01T00:00:00Z',
        title: 'Х',
        type: 'note',
      }),
    ).toThrow()
    expect(() =>
      medicalEventCreateSchema.parse({
        occurredAt: '2026-01-01T00:00:00Z',
        title: 'Х',
        description: 'x'.repeat(5001),
      }),
    ).toThrow()
    expect(() =>
      medicalEventCreateSchema.parse({
        occurredAt: '2026-01-01T00:00:00Z',
        title: 'Х',
        episodeId: 'not-a-uuid',
      }),
    ).toThrow()
  })
})

describe('medicalEventUpdateSchema', () => {
  it('allows partial updates and keeps missing keys absent', () => {
    const parsed = medicalEventUpdateSchema.parse({ title: 'Обновлено' })
    expect(parsed).toEqual({ title: 'Обновлено' })
    expect('description' in parsed).toBe(false)
    expect('episodeId' in parsed).toBe(false)
  })

  it('allows explicit null description and episodeId', () => {
    const parsed = medicalEventUpdateSchema.parse({
      description: null,
      episodeId: null,
    })
    expect(parsed.description).toBeNull()
    expect(parsed.episodeId).toBeNull()
  })

  it('rejects empty body, empty strings, bad instants and unknown fields', () => {
    expect(() => medicalEventUpdateSchema.parse({})).toThrow()
    expect(() => medicalEventUpdateSchema.parse({ title: '' })).toThrow()
    expect(() => medicalEventUpdateSchema.parse({ description: '' })).toThrow()
    expect(() =>
      medicalEventUpdateSchema.parse({ occurredAt: 'не дата' }),
    ).toThrow()
    expect(() => medicalEventUpdateSchema.parse({ bogus: 1 })).toThrow()
    expect(() =>
      medicalEventUpdateSchema.parse({ episodeId: 'not-a-uuid' }),
    ).toThrow()
  })
})
