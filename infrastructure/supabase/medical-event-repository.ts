/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MedicalEventRepository } from '../../ports/medical-event-repository'
import type { MedicalEvent } from '../../domain/medical-event'
const map = (r: any): MedicalEvent => ({
  id: r.id,
  familyId: r.family_id,
  personId: r.person_id,
  episodeId: r.episode_id,
  type: r.type,
  occurredAt: r.occurred_at,
  title: r.title,
  description: r.description,
  source: r.source,
  authorId: r.author_id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})
export class SupabaseMedicalEventRepository implements MedicalEventRepository {
  constructor(private readonly client: any) {}
  private base(familyId: string, personId: string) {
    return this.client
      .from('medical_events')
      .select('*', { count: 'exact' })
      .eq('family_id', familyId)
      .eq('person_id', personId)
  }
  async list(familyId: string, personId: string, input: any) {
    let q = this.base(familyId, personId)
      .order('occurred_at', { ascending: false })
      .order('id', { ascending: false })
      .range(input.offset, input.offset + input.limit - 1)
    if (input.from) q = q.gte('occurred_at', input.from)
    if (input.to) q = q.lte('occurred_at', input.to)
    if (input.type) q = q.eq('type', input.type)
    if (input.episodeId) q = q.eq('episode_id', input.episodeId)
    const { data, error, count } = await q
    if (error) throw error
    return { events: (data || []).map(map), total: count || 0 }
  }
  async create(familyId: string, personId: string, input: any) {
    const { data, error } = await this.client
      .from('medical_events')
      .insert({
        family_id: familyId,
        person_id: personId,
        episode_id: input.episodeId,
        type: input.type,
        occurred_at: input.occurredAt,
        title: input.title,
        description: input.description,
        source: input.source,
        author_id: input.authorId,
      })
      .select()
      .single()
    if (error) throw error
    return map(data)
  }
  async get(familyId: string, personId: string, eventId: string) {
    const { data, error } = await this.base(familyId, personId)
      .eq('id', eventId)
      .maybeSingle()
    if (error) throw error
    return data ? map(data) : null
  }
  async update(
    familyId: string,
    personId: string,
    eventId: string,
    input: any,
    editableType?: string,
  ) {
    const changes: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (input.occurredAt !== undefined) changes.occurred_at = input.occurredAt
    if (input.title !== undefined) changes.title = input.title
    if (input.description !== undefined) changes.description = input.description
    if (input.episodeId !== undefined) changes.episode_id = input.episodeId
    // M002 D5: the row-level type filter closes the check-then-act race
    // window in the service even if future writers gain a type mutation.
    const filtered = editableType
      ? this.base(familyId, personId).eq('id', eventId).eq('type', editableType)
      : this.base(familyId, personId).eq('id', eventId)
    const { data, error } = await filtered
      .update(changes)
      .select()
      .maybeSingle()
    if (error) throw error
    return data ? map(data) : null
  }
  async delete(
    familyId: string,
    personId: string,
    eventId: string,
    editableType?: string,
  ) {
    const filtered = editableType
      ? this.base(familyId, personId).eq('id', eventId).eq('type', editableType)
      : this.base(familyId, personId).eq('id', eventId)
    const { data, error } = await filtered.delete().select()
    if (error) throw error
    return Array.isArray(data) && data.length > 0
  }
}
