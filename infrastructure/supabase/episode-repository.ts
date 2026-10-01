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
    const { data, error } = await this.client.rpc('upsert_episode', {
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
  ) {
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
