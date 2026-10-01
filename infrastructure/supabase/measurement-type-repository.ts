/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  MeasurementType,
  MeasurementTypeStatus,
} from '../../domain/measurement-type'
import type {
  MeasurementTypeCreateInput,
  MeasurementTypeListInput,
  MeasurementTypeRepository,
  MeasurementTypeUpdateInput,
} from '../../ports/measurement-type-repository'

const map = (row: any): MeasurementType => ({
  id: row.id,
  familyId: row.family_id,
  name: row.name,
  category: row.category,
  description: row.description,
  valueType: row.value_type,
  unit: row.unit,
  allowedUnits: row.allowed_units || [],
  status: row.status,
  isPreset: row.is_preset,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export class SupabaseMeasurementTypeRepository implements MeasurementTypeRepository {
  constructor(private readonly client: any) {}

  private base(familyId: string) {
    return this.client
      .from('measurement_types')
      .select('*', { count: 'exact' })
      .eq('family_id', familyId)
  }

  async list(familyId: string, input: MeasurementTypeListInput) {
    let query = this.base(familyId)
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .range(input.offset, input.offset + input.limit - 1)
    if (input.name) query = query.ilike('name', `%${input.name}%`)
    const { data, error, count } = await query
    if (error) throw error
    return { types: (data || []).map(map), total: count || 0 }
  }

  async get(familyId: string, typeId: string) {
    const { data, error } = await this.base(familyId)
      .eq('id', typeId)
      .maybeSingle()
    if (error) throw error
    return data ? map(data) : null
  }

  async create(familyId: string, input: MeasurementTypeCreateInput) {
    const { data, error } = await this.client
      .from('measurement_types')
      .insert({
        family_id: familyId,
        name: input.name,
        category: input.category,
        description: input.description,
        value_type: input.valueType,
        unit: input.unit,
        allowed_units: input.allowedUnits,
        status: 'active',
        is_preset: false,
      })
      .select()
      .single()
    if (error) throw error
    return map(data)
  }

  async update(
    familyId: string,
    typeId: string,
    input: MeasurementTypeUpdateInput,
  ) {
    const changes: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (input.name !== undefined) changes.name = input.name
    if (input.category !== undefined) changes.category = input.category
    if (input.description !== undefined) changes.description = input.description
    if (input.valueType !== undefined) changes.value_type = input.valueType
    if (input.unit !== undefined) changes.unit = input.unit
    if (input.allowedUnits !== undefined)
      changes.allowed_units = input.allowedUnits
    if (input.status !== undefined) changes.status = input.status

    const { data, error } = await this.client
      .from('measurement_types')
      .update(changes)
      .eq('family_id', familyId)
      .eq('id', typeId)
      .eq('is_preset', false)
      .select()
      .maybeSingle()
    if (error) throw error
    return data ? map(data) : null
  }

  async archive(
    familyId: string,
    typeId: string,
    status: MeasurementTypeStatus,
  ) {
    const { data, error } = await this.client
      .from('measurement_types')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('family_id', familyId)
      .eq('id', typeId)
      .eq('is_preset', false)
      .select()
      .maybeSingle()
    if (error) throw error
    return data ? map(data) : null
  }
}
