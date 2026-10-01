/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Episode } from '../../domain/episode'
import type {
  EpisodeRepository,
  EpisodeCreateInput,
  EpisodeUpdateInput,
} from '../../ports/episode-repository'
import type { EpisodeDto } from '../dto/episode'

export const episodeDto = (e: Episode): EpisodeDto => ({
  id: e.id,
  title: e.title,
  description: e.description,
  status: e.status,
  startedAt: e.startedAt,
  endedAt: e.endedAt,
  outcome: e.outcome,
  symptoms: e.symptoms.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  })),
  tags: e.tags.map((t) => ({
    id: t.id,
    name: t.name,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  })),
  createdAt: e.createdAt,
  updatedAt: e.updatedAt,
})

export class EpisodeService {
  constructor(private readonly episodes: EpisodeRepository) {}
  list(familyId: string, personId: string, input: any) {
    return this.episodes.list(familyId, personId, input).then((r) => ({
      episodes: r.episodes.map(episodeDto),
      total: r.total,
    }))
  }
  create(
    familyId: string,
    personId: string,
    input: EpisodeCreateInput,
    authorId?: string,
  ) {
    return this.episodes
      .create(familyId, personId, { ...input, authorId })
      .then(episodeDto)
  }
  get(familyId: string, personId: string, id: string) {
    return this.episodes
      .get(familyId, personId, id)
      .then((e) => e && episodeDto(e))
  }
  update(
    familyId: string,
    personId: string,
    id: string,
    input: EpisodeUpdateInput,
  ) {
    return this.episodes
      .update(familyId, personId, id, input)
      .then((e) => e && episodeDto(e))
  }
  transition(
    familyId: string,
    personId: string,
    id: string,
    status: 'active' | 'completed',
    authorId?: string,
  ) {
    return this.episodes
      .setStatus(familyId, personId, id, status, authorId)
      .then((e) => e && episodeDto(e))
  }
  delete(familyId: string, personId: string, id: string) {
    return this.episodes.delete(familyId, personId, id)
  }
}
