/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Measurement } from '../../domain/measurement'
import type {
  MeasurementCreateInput,
  MeasurementListInput,
  MeasurementRepository,
  MeasurementUpdateInput,
} from '../../ports/measurement-repository'

const mapNumeric = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  return typeof value === 'number' ? value : Number(value)
}

const map = (row: any): Measurement => ({
  id: row.id,
  familyId: row.family_id,
  personId: row.person_id,
  measurementTypeId: row.measurement_type_id,
  episodeId: row.episode_id,
  occurredAt: row.occurred_at,
  numericValue: mapNumeric(row.numeric_value),
  textValue: row.text_value,
  booleanValue: row.boolean_value,
  compoundValue: row.compound_value,
  unit: row.unit,
  comment: row.comment,
  source: row.source,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export class SupabaseMeasurementRepository implements MeasurementRepository {
  constructor(private readonly client: any) {}

  private base(familyId: string, personId: string) {
    return this.client
      .from('measurements')
      .select('*', { count: 'exact' })
      .eq('family_id', familyId)
      .eq('person_id', personId)
  }

  async list(familyId: string, personId: string, input: MeasurementListInput) {
    let query = this.base(familyId, personId)
      .order('occurred_at', { ascending: false })
      .order('id', { ascending: false })
      .range(input.offset, input.offset + input.limit - 1)
    if (input.from) query = query.gte('occurred_at', input.from)
    if (input.to) query = query.lte('occurred_at', input.to)
    if (input.typeId) query = query.eq('measurement_type_id', input.typeId)
    const { data, error, count } = await query
    if (error) throw error
    return { measurements: (data || []).map(map), total: count || 0 }
  }

  async get(familyId: string, personId: string, measurementId: string) {
    const { data, error } = await this.base(familyId, personId)
      .eq('id', measurementId)
      .maybeSingle()
    if (error) throw error
    return data ? map(data) : null
  }

  async create(
    familyId: string,
    personId: string,
    input: MeasurementCreateInput,
  ) {
    const { data, error } = await this.client.rpc('create_measurement', {
      p_family_id: familyId,
      p_person_id: personId,
      p_measurement: input,
    })
    if (error) throw error
    if (!data) throw new Error('Measurement was not returned')
    return map(data)
  }

  async update(
    familyId: string,
    personId: string,
    measurementId: string,
    input: MeasurementUpdateInput,
  ) {
    const { data, error } = await this.client.rpc('update_measurement', {
      p_family_id: familyId,
      p_person_id: personId,
      p_measurement_id: measurementId,
      p_changes: input,
    })
    if (error) throw error
    if (!data) throw new Error('Measurement was not returned')
    return map(data)
  }

  async delete(familyId: string, personId: string, measurementId: string) {
    const { data, error } = await this.client.rpc('delete_measurement', {
      p_family_id: familyId,
      p_person_id: personId,
      p_measurement_id: measurementId,
    })
    if (error) throw error
    return typeof data === 'string' && data === measurementId
  }
}
