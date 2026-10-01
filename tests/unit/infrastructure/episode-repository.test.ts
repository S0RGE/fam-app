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
  update(): QueryChain
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
    update: () => chain,
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

  it('create calls create_episode without an id and passes the author (M002 D2)', async () => {
    let rpcFn = ''
    let rpcArgs: unknown
    const { chain } = chainWith({ id: 'new-id' })
    const repository = new SupabaseEpisodeRepository({
      from: () => chain,
      rpc: (fn: string, args: unknown) => {
        rpcFn = fn
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
      authorId: 'account-1',
    } as never)
    expect(result.id).toBe('new-id')
    expect(rpcFn).toBe('create_episode')
    expect(rpcArgs).toMatchObject({
      p_family_id: 'family-a',
      p_person_id: 'person-b',
      p_episode: { title: 'ОРВИ' },
      p_author_id: 'account-1',
    })
    const pEpisode = (
      rpcArgs as {
        p_episode?: Record<string, unknown>
      }
    )?.p_episode
    expect(pEpisode?.id).toBeUndefined()
  })

  it('completed transition calls complete_episode with the episode end date and author (M002 D2)', async () => {
    let rpcFn = ''
    let rpcArgs: unknown
    const endedRow = { ...row, ended_at: '2026-01-05T00:00:00Z' }
    const { chain } = chainWith(endedRow)
    const repository = new SupabaseEpisodeRepository({
      from: () => chain,
      rpc: (fn: string, args: unknown) => {
        rpcFn = fn
        rpcArgs = args
        return Promise.resolve({ data: { id: 'episode-id' }, error: null })
      },
    } as never)
    const result = await repository.setStatus(
      'family-a',
      'person-b',
      'episode-id',
      'completed',
      'account-1',
    )
    expect(result?.id).toBe('episode-id')
    expect(rpcFn).toBe('complete_episode')
    expect(rpcArgs).toEqual({
      p_family_id: 'family-a',
      p_person_id: 'person-b',
      p_episode_id: 'episode-id',
      p_ended_at: '2026-01-05T00:00:00Z',
      p_outcome: null,
      p_author_id: 'account-1',
    })
  })

  it('completed transition without an explicit end date falls back to now (M002 D2)', async () => {
    let rpcArgs: unknown
    const { chain } = chainWith(row)
    const repository = new SupabaseEpisodeRepository({
      from: () => chain,
      rpc: (_fn: string, args: unknown) => {
        rpcArgs = args
        return Promise.resolve({ data: { id: 'episode-id' }, error: null })
      },
    } as never)
    await repository.setStatus(
      'family-a',
      'person-b',
      'episode-id',
      'completed',
      'account-1',
    )
    const endedAt = new Date(
      (rpcArgs as Record<string, unknown>)['p_ended_at'] as string,
    )
    expect(Number.isNaN(endedAt.getTime())).toBe(false)
    expect(Math.abs(endedAt.getTime() - Date.now())).toBeLessThan(60_000)
  })

  it('reopening a completed episode stays on the RLS update path without rpc (M002 D2)', async () => {
    let rpcCalls = 0
    const { chain, filters } = chainWith(row)
    const repository = new SupabaseEpisodeRepository({
      from: () => chain,
      rpc: () => {
        rpcCalls++
        return Promise.resolve({ data: null, error: null })
      },
    } as never)
    const result = await repository.setStatus(
      'family-a',
      'person-b',
      'episode-id',
      'active',
      'account-1',
    )
    expect(result?.id).toBe('episode-id')
    expect(rpcCalls).toBe(0)
    expect(filters).toContainEqual(['id', 'episode-id'])
    expect(filters).toContainEqual(['family_id', 'family-a'])
    expect(filters).toContainEqual(['person_id', 'person-b'])
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
