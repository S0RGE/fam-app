import type { Episode, EpisodeStatus } from '../domain/episode'

export interface EpisodeListInput {
  limit: number
  offset: number
  status?: EpisodeStatus
}

export interface EpisodeCreateInput {
  title: string
  description: string | null
  startedAt: string
  endedAt: string | null
  outcome: string | null
  symptoms: { name: string; description: string | null }[]
  tags: string[]
}

export interface EpisodeUpdateInput {
  title?: string
  description?: string | null
  startedAt?: string
  endedAt?: string | null
  outcome?: string | null
  symptoms?: { name: string; description: string | null }[]
  tags?: string[]
}

export interface EpisodeRepository {
  list(
    familyId: string,
    personId: string,
    input: EpisodeListInput,
  ): Promise<{ episodes: Episode[]; total: number }>
  create(
    familyId: string,
    personId: string,
    input: EpisodeCreateInput,
  ): Promise<Episode>
  get(
    familyId: string,
    personId: string,
    episodeId: string,
  ): Promise<Episode | null>
  update(
    familyId: string,
    personId: string,
    episodeId: string,
    input: EpisodeUpdateInput,
  ): Promise<Episode | null>
  setStatus(
    familyId: string,
    personId: string,
    episodeId: string,
    status: EpisodeStatus,
  ): Promise<Episode | null>
  delete(
    familyId: string,
    personId: string,
    episodeId: string,
  ): Promise<boolean>
}
