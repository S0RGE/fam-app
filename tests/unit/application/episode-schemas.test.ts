import { describe, expect, it } from 'vitest'
import {
  episodeCreateSchema,
  episodeUpdateSchema,
  episodeQuerySchema,
} from '../../../application/dto/episode'

describe('episodeCreateSchema', () => {
  it('normalizes startedAt to UTC ISO and accepts a minimal episode', () => {
    const parsed = episodeCreateSchema.parse({
      title: 'ОРВИ',
      startedAt: '2026-01-02T03:00:00+03:00',
    })
    expect(parsed.title).toBe('ОРВИ')
    expect(parsed.startedAt).toBe('2026-01-02T00:00:00.000Z')
    expect(parsed.symptoms).toEqual([])
    expect(parsed.tags).toEqual([])
  })

  it('rejects missing required fields and unknown fields', () => {
    expect(() =>
      episodeCreateSchema.parse({ startedAt: '2026-01-02T00:00:00Z' }),
    ).toThrow()
    expect(() =>
      episodeCreateSchema.parse({
        title: 'Х',
        startedAt: '2026-01-02T00:00:00Z',
        bogus: 1,
      }),
    ).toThrow()
  })

  it('rejects an end date earlier than the start date', () => {
    expect(() =>
      episodeCreateSchema.parse({
        title: 'Х',
        startedAt: '2026-01-05T00:00:00Z',
        endedAt: '2026-01-01T00:00:00Z',
      }),
    ).toThrow()
  })

  it('accepts an end date equal to or after the start date', () => {
    expect(() =>
      episodeCreateSchema.parse({
        title: 'Х',
        startedAt: '2026-01-01T00:00:00Z',
        endedAt: '2026-01-01T00:00:00Z',
      }),
    ).not.toThrow()
  })

  it('validates symptoms and tags bounds', () => {
    expect(() =>
      episodeCreateSchema.parse({
        title: 'Х',
        startedAt: '2026-01-01T00:00:00Z',
        symptoms: [{ name: '', description: 'x' }],
      }),
    ).toThrow()
    expect(() =>
      episodeCreateSchema.parse({
        title: 'Х',
        startedAt: '2026-01-01T00:00:00Z',
        tags: Array(51).fill('tag'),
      }),
    ).toThrow()
  })
})

describe('episodeUpdateSchema', () => {
  it('allows partial updates', () => {
    const parsed = episodeUpdateSchema.parse({ title: 'Обновлено' })
    expect(parsed.title).toBe('Обновлено')
  })

  it('enforces the end-after-start invariant on partial updates', () => {
    expect(() =>
      episodeUpdateSchema.parse({
        startedAt: '2026-01-05T00:00:00Z',
        endedAt: '2026-01-01T00:00:00Z',
      }),
    ).toThrow()
  })
})

describe('episodeQuerySchema', () => {
  it('applies defaults and filters by status', () => {
    expect(episodeQuerySchema.parse({})).toMatchObject({ limit: 20, offset: 0 })
    expect(episodeQuerySchema.parse({ status: 'completed' })).toMatchObject({
      status: 'completed',
    })
    expect(() => episodeQuerySchema.parse({ status: 'bogus' })).toThrow()
  })
})
