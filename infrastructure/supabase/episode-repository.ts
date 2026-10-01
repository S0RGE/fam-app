/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EpisodeRepository } from '../../ports/episode-repository'
import type { Episode } from '../../domain/episode'
const mapSymptom = (s: any) => ({
  id: s.id,
  name: s.name,
  description: s.description,
  createdAt: s.created_at,
  updatedAt: s.updated_at,
})
const mapTag = (t: any) => ({
  id: t.id,
  name: t.name,
  createdAt: t.created_at,
  updatedAt: t.updated_at,
})
const map = (r: any): Episode => ({
  id: r.id,
  familyId: r.family_id,
  personId: r.person_id,
  title: r.title,
  description: r.description,
  status: r.status,
  startedAt: r.started_at,
  endedAt: r.ended_at,
  outcome: r.outcome,
  symptoms: (r.episode_symptoms || []).map(mapSymptom),
  tags: (r.episode_tags || [])
    .map((et: any) => (et && et.tags ? mapTag(et.tags) : null))
    .filter((t: any): t is NonNullable<typeof t> => t != null),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})
export class SupabaseEpisodeRepository implements EpisodeRepository {
  constructor(private readonly client: any) {}
  /**
   * Resolves the authenticated account (claims.sub) of the request-scoped
   * Supabase client for the auto timeline events (M002 D1/D2). The routes
   * pass the author explicitly; this fallback keeps the repository
   * self-sufficient when a direct call omits it. If neither is available,
   * null is passed and the database NOT NULL constraint rejects the event
   * (fail-closed — an auto event never becomes anonymous).
   */
  private async currentAuthor(): Promise<string | null> {
    if (typeof this.client?.auth?.getUser !== 'function') return null
    const { data, error } = await this.client.auth.getUser()
    if (error || typeof data?.user?.id !== 'string') return null
    return data.user.id
  }
  private base(familyId: string, personId: string) {
    return this.client
      .from('episodes')
      .select('*,episode_symptoms(*),episode_tags(tag_id, tags(*))', {
        count: 'exact',
      })
      .eq('family_id', familyId)
      .eq('person_id', personId)
  }
  async list(familyId: string, personId: string, input: any) {
    let q = this.base(familyId, personId)
      .order('created_at')
      .order('id')
      .range(input.offset, input.offset + input.limit - 1)
    if (input.status) q = q.eq('status', input.status)
    const { data, error, count } = await q
    if (error) throw error
    return { episodes: (data || []).map(map), total: count || 0 }
  }
  async create(familyId: string, personId: string, input: any) {
    // M002 D2: creation goes through the atomic create_episode compound
    // function, which also inserts the episode_start timeline event. The
    // p_episode payload keeps the 0002 upsert_episode shape.
    const authorId =
      typeof input.authorId === 'string' && input.authorId
        ? input.authorId
        : await this.currentAuthor()
    const { data, error } = await this.client.rpc('create_episode', {
      p_family_id: familyId,
      p_person_id: personId,
      p_episode: {
        title: input.title,
        description: input.description,
        startedAt: input.startedAt,
        endedAt: input.endedAt,
        outcome: input.outcome,
        symptoms: input.symptoms || [],
        tags: input.tags || [],
      },
      p_author_id: authorId,
    })
    if (error) throw error
    if (!data || typeof data.id !== 'string')
      throw new Error('Episode was not returned')
    const result = await this.get(familyId, personId, data.id)
    if (!result) throw new Error('Episode was not returned')
    return result
  }
  async get(familyId: string, personId: string, episodeId: string) {
    const { data, error } = await this.base(familyId, personId)
      .eq('id', episodeId)
      .maybeSingle()
    if (error) throw error
    return data ? map(data) : null
  }
  async update(
    familyId: string,
    personId: string,
    episodeId: string,
    input: any,
  ) {
    const { error } = await this.client.rpc('upsert_episode', {
      p_family_id: familyId,
      p_person_id: personId,
      p_episode: {
        id: episodeId,
        title: input.title ?? null,
        description: input.description ?? null,
        startedAt: input.startedAt ?? null,
        endedAt: input.endedAt ?? null,
        outcome: input.outcome ?? null,
        symptoms: input.symptoms ?? [],
        tags: input.tags ?? [],
      },
    })
    if (error) throw error
    const result = await this.get(familyId, personId, episodeId)
    if (!result) throw new Error('Episode was not returned')
    return result
  }
  async setStatus(
    familyId: string,
    personId: string,
    episodeId: string,
    status: any,
    authorId?: string,
  ) {
    if (status === 'completed') {
      // M002 D2: completion goes through the atomic complete_episode
      // compound function, which also inserts the episode_end event.
      const episode = await this.get(familyId, personId, episodeId)
      if (!episode) return null
      const author =
        typeof authorId === 'string' && authorId
          ? authorId
          : await this.currentAuthor()
      const { data, error } = await this.client.rpc('complete_episode', {
        p_family_id: familyId,
        p_person_id: personId,
        p_episode_id: episodeId,
        // The episode_end event moment is the episode's end date; M001 does
        // not require an explicit end date on completion, so fall back to now.
        p_ended_at: episode.endedAt ?? new Date().toISOString(),
        p_outcome: episode.outcome,
        p_author_id: author,
      })
      if (error) throw error
      if (!data || typeof data.id !== 'string')
        throw new Error('Episode was not returned')
      const result = await this.get(familyId, personId, data.id)
      if (!result) throw new Error('Episode was not returned')
      return result
    }
    // Reopening a completed episode intentionally creates no events and
    // stays on the plain RLS update path (M002 D2).
    const { data, error } = await this.client
      .from('episodes')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('family_id', familyId)
      .eq('person_id', personId)
      .eq('id', episodeId)
      .select()
      .maybeSingle()
    if (error) throw error
    return data ? map(data) : null
  }
  async delete(familyId: string, personId: string, episodeId: string) {
    const { data, error } = await this.client
      .from('episodes')
      .delete()
      .eq('family_id', familyId)
      .eq('person_id', personId)
      .eq('id', episodeId)
    if (error) throw error
    return Array.isArray(data) && data.length > 0
  }
}
