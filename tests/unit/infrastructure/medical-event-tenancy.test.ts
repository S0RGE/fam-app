import { describe, expect, it } from 'vitest'
import { SupabaseMedicalEventRepository } from '../../../infrastructure/supabase/medical-event-repository'

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Chain {
  select(opts?: { count?: string }): Chain
  insert(payload: unknown): Chain
  update(payload: unknown): Chain
  delete(): Chain
  eq(field: string, value: unknown): Chain
  order(): Chain
  range(): Chain
  gte(): Chain
  lte(): Chain
  then(onfulfilled?: (v: unknown) => unknown): Promise<unknown>
}

function makeClient(resolveValue: unknown, resolveCount: number | null = null) {
  const filters: Array<[string, unknown]> = []
  const inserted: unknown[] = []
  const updated: unknown[] = []
  // Plain value object for `await chain`; `then` returns a real Promise with
  // a plain (non-thenable) value to avoid thenable-recursion.
  const result = { data: resolveValue, error: null, count: resolveCount }
  const chain: Chain = {
    select: (opts?: { count?: string }) => {
      if (opts?.count === 'exact') result.count = resolveCount
      return chain
    },
    insert: (payload: unknown) => {
      inserted.push(payload)
      return chain
    },
    update: (payload: unknown) => {
      updated.push(payload)
      return chain
    },
    delete: () => chain,
    eq: (field: string, value: unknown) => {
      filters.push([field, value])
      return chain
    },
    order: () => chain,
    range: () => chain,
    gte: () => chain,
    lte: () => chain,
    then: (onfulfilled?: (v: unknown) => unknown) => {
      const settled: { value: unknown; error?: unknown } = {
        value: onfulfilled ? onfulfilled({ ...result }) : { ...result },
      }
      return new Promise((resolve, reject) => {
        if (settled.error) reject(settled.error)
        else resolve(settled.value)
      })
    },
  }
  const maybeSingle = async () => ({ data: resolveValue, error: null })
  const single = async () => ({ data: resolveValue, error: null })
  const client = {
    from: (table: string) => {
      expect(table).toBe('medical_events')
      return Object.assign(chain, { maybeSingle, single })
    },
  }
  return { client, filters, inserted, updated }
}

const noteRow = {
  id: 'event-id',
  family_id: 'family-a',
  person_id: 'person-b',
  episode_id: null,
  type: 'note',
  occurred_at: '2026-01-02T00:00:00Z',
  title: 'Заметка',
  description: null,
  source: 'manual',
  author_id: 'account-1',
  created_at: 'c',
  updated_at: 'u',
}

describe('SupabaseMedicalEventRepository tenant boundaries', () => {
  it('scopes a note lookup by family, person and event identifiers', async () => {
    const { client, filters } = makeClient(null)
    const repository = new SupabaseMedicalEventRepository(client as any)
    await expect(
      repository.get('family-a', 'person-b', 'event-id'),
    ).resolves.toBeNull()
    expect(filters).toEqual([
      ['family_id', 'family-a'],
      ['person_id', 'person-b'],
      ['id', 'event-id'],
    ])
  })

  it('creates only inside the family and person scope with the author', async () => {
    const { client, inserted } = makeClient(noteRow)
    const repository = new SupabaseMedicalEventRepository(client as any)
    const created = await repository.create('family-a', 'person-b', {
      type: 'note',
      occurredAt: '2026-01-02T00:00:00Z',
      episodeId: null,
      title: 'Заметка',
      description: null,
      source: 'manual',
      authorId: 'account-1',
    })
    expect(created.id).toBe('event-id')
    expect(inserted).toEqual([
      {
        family_id: 'family-a',
        person_id: 'person-b',
        episode_id: null,
        type: 'note',
        occurred_at: '2026-01-02T00:00:00Z',
        title: 'Заметка',
        description: null,
        source: 'manual',
        author_id: 'account-1',
      },
    ])
  })

  it('scopes updates to the family, person, event and editable type', async () => {
    const { client, filters, updated } = makeClient(noteRow)
    const repository = new SupabaseMedicalEventRepository(client as any)
    const result = await repository.update(
      'family-a',
      'person-b',
      'event-id',
      { title: 'Обновлено' },
      'note',
    )
    expect(result?.id).toBe('event-id')
    expect(filters).toEqual([
      ['family_id', 'family-a'],
      ['person_id', 'person-b'],
      ['id', 'event-id'],
      ['type', 'note'],
    ])
    expect(updated[0]).toMatchObject({ title: 'Обновлено' })
  })

  it('scopes deletions to the family, person, event and editable type', async () => {
    const { client, filters } = makeClient([{ id: 'event-id' }])
    const repository = new SupabaseMedicalEventRepository(client as any)
    await expect(
      repository.delete('family-a', 'person-b', 'event-id', 'note'),
    ).resolves.toBe(true)
    expect(filters).toEqual([
      ['family_id', 'family-a'],
      ['person_id', 'person-b'],
      ['id', 'event-id'],
      ['type', 'note'],
    ])
  })

  it('reports no rows when the scoped deletion matches nothing', async () => {
    const { client } = makeClient([])
    const repository = new SupabaseMedicalEventRepository(client as any)
    await expect(
      repository.delete('family-a', 'person-b', 'event-id', 'note'),
    ).resolves.toBe(false)
  })
})
