import { describe, expect, it } from 'vitest'
import { SupabaseEpisodeRepository } from '../../../infrastructure/supabase/episode-repository'

const row = {
  id: 'episode-id',
  family_id: 'family-a',
  person_id: 'person-b',
  title: 'ОРВИ',
  description: 'Описание',
  status: 'active',
  started_at: '2026-01-02T00:00:00Z',
  ended_at: null,
  outcome: null,
  episode_symptoms: [
    {
      id: 's1',
      name: 'Температура',
      description: 'высокая',
      created_at: 'c',
      updated_at: 'u',
    },
  ],
  episode_tags: [
    {
      tag_id: 't1',
      tags: { id: 't1', name: 'Зимний', created_at: 'c', updated_at: 'u' },
    },
  ],
  created_at: 'c',
  updated_at: 'u',
}

interface QueryChain {
  data: unknown
  error: null
  select(): QueryChain
  eq(field: string, value: unknown): QueryChain
  order(): QueryChain
  range(): QueryChain
  maybeSingle(): Promise<{ data: unknown; error: null }>
  delete(): QueryChain
}

function chainWith(resolvedData: unknown) {
  const filters: Array<[string, unknown]> = []
  const chain: QueryChain = {
    data: resolvedData,
    error: null,
    select: () => chain,
    eq: (field: string, value: unknown) => {
      filters.push([field, value])
      return chain
    },
    order: () => chain,
    range: () => chain,
    maybeSingle: async () => ({ data: resolvedData, error: null }),
    delete: () => chain,
  }
  return { chain, filters }
}

describe('SupabaseEpisodeRepository mapping', () => {
  it('maps nested symptoms and tags to camelCase domain model', async () => {
    const { chain } = chainWith(row)
    const repository = new SupabaseEpisodeRepository({
      from: () => chain,
    } as never)
    const episode = await repository.get('family-a', 'person-b', 'episode-id')
    expect(episode).toMatchObject({
      id: 'episode-id',
      familyId: 'family-a',
      personId: 'person-b',
      title: 'ОРВИ',
      status: 'active',
      symptoms: [{ id: 's1', name: 'Температура', description: 'высокая' }],
      tags: [{ id: 't1', name: 'Зимний' }],
    })
  })
})

describe('SupabaseEpisodeRepository tenant boundaries', () => {
  it('scopes episode get by family, person and episode identifiers', async () => {
    const { chain, filters } = chainWith(null)
    const repository = new SupabaseEpisodeRepository({
      from: () => chain,
    } as never)
    await expect(
      repository.get('family-a', 'person-b', 'episode-id'),
    ).resolves.toBeNull()
    expect(filters).toEqual([
      ['family_id', 'family-a'],
      ['person_id', 'person-b'],
      ['id', 'episode-id'],
    ])
  })

  it('create calls upsert_episode without an id and returns the created episode', async () => {
    let rpcArgs: unknown
    const { chain } = chainWith({ id: 'new-id' })
    const repository = new SupabaseEpisodeRepository({
      from: () => chain,
      rpc: (_fn: string, args: unknown) => {
        rpcArgs = args
        return Promise.resolve({ data: { id: 'new-id' }, error: null })
      },
    } as never)
    const result = await repository.create('family-a', 'person-b', {
      title: 'ОРВИ',
      description: null,
      startedAt: '2026-01-02T00:00:00Z',
      endedAt: null,
      outcome: null,
      symptoms: [],
      tags: [],
    } as never)
    expect(result.id).toBe('new-id')
    expect(rpcArgs).toMatchObject({
      p_family_id: 'family-a',
      p_person_id: 'person-b',
      p_episode: { title: 'ОРВИ' },
    })
  })

  it('update calls upsert_episode with the episode id', async () => {
    let rpcArgs: unknown
    const { chain } = chainWith({ id: 'episode-id' })
    const repository = new SupabaseEpisodeRepository({
      from: () => chain,
      rpc: (_fn: string, args: unknown) => {
        rpcArgs = args
        return Promise.resolve({ data: { id: 'episode-id' }, error: null })
      },
    } as never)
    await repository.update('family-a', 'person-b', 'episode-id', {
      title: 'ОРВИ2',
    } as never)
    expect((rpcArgs as { p_episode: { id: string } }).p_episode.id).toBe(
      'episode-id',
    )
  })

  it('delete removes only the family, person and episode row', async () => {
    const { chain, filters } = chainWith([{ id: 'episode-id' }])
    const repository = new SupabaseEpisodeRepository({
      from: () => chain,
    } as never)
    await expect(
      repository.delete('family-a', 'person-b', 'episode-id'),
    ).resolves.toBe(true)
    expect(filters).toEqual([
      ['family_id', 'family-a'],
      ['person_id', 'person-b'],
      ['id', 'episode-id'],
    ])
  })
})
