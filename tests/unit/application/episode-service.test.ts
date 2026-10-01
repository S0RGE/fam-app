import { describe, expect, it } from 'vitest'
import { EpisodeService } from '../../../application/episodes/episode-service'
import type { EpisodeRepository } from '../../../ports/episode-repository'
import type { Episode } from '../../../domain/episode'

const episode: Episode = {
  id: 'episode-id',
  familyId: 'family-a',
  personId: 'person-b',
  title: 'ОРВИ',
  description: 'Описание',
  status: 'active',
  startedAt: '2026-01-02T00:00:00.000Z',
  endedAt: null,
  outcome: null,
  symptoms: [
    {
      id: 's1',
      name: 'Температура',
      description: 'высокая',
      createdAt: 'c',
      updatedAt: 'u',
    },
  ],
  tags: [{ id: 't1', name: 'Зимний', createdAt: 'c', updatedAt: 'u' }],
  createdAt: 'c',
  updatedAt: 'u',
}

const repository: EpisodeRepository = {
  list: async () => ({ episodes: [episode], total: 1 }),
  create: async () => episode,
  get: async () => episode,
  update: async () => episode,
  setStatus: async (_f, _p, _e, status) => ({ ...episode, status }),
  delete: async () => true,
}

describe('EpisodeService', () => {
  it('maps list, get, transition and delete through the repository', async () => {
    const service = new EpisodeService(repository)
    await expect(
      service.list('family-a', 'person-b', { limit: 20, offset: 0 }),
    ).resolves.toMatchObject({
      total: 1,
      episodes: [{ id: 'episode-id', title: 'ОРВИ' }],
    })
    await expect(
      service.get('family-a', 'person-b', 'episode-id'),
    ).resolves.toMatchObject({
      status: 'active',
      symptoms: [{ name: 'Температура' }],
      tags: [{ name: 'Зимний' }],
    })
    await expect(
      service.transition('family-a', 'person-b', 'episode-id', 'completed'),
    ).resolves.toMatchObject({ status: 'completed' })
    await expect(
      service.delete('family-a', 'person-b', 'episode-id'),
    ).resolves.toBe(true)
  })
})
