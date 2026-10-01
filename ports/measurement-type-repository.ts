import type {
  MeasurementType,
  MeasurementTypeStatus,
  MeasurementValueType,
} from '../domain/measurement-type'

export interface MeasurementTypeListInput {
  limit: number
  offset: number
  name?: string
}

export interface MeasurementTypeCreateInput {
  name: string
  category: string
  description: string | null
  valueType: MeasurementValueType
  unit: string | null
  allowedUnits: string[]
}

export interface MeasurementTypeUpdateInput {
  name?: string
  category?: string
  description?: string | null
  valueType?: MeasurementValueType
  unit?: string | null
  allowedUnits?: string[]
  status?: MeasurementTypeStatus
}

export interface MeasurementTypeRepository {
  list(
    familyId: string,
    input: MeasurementTypeListInput,
  ): Promise<{ types: MeasurementType[]; total: number }>
  get(familyId: string, typeId: string): Promise<MeasurementType | null>
  create(
    familyId: string,
    input: MeasurementTypeCreateInput,
  ): Promise<MeasurementType>
  update(
    familyId: string,
    typeId: string,
    input: MeasurementTypeUpdateInput,
  ): Promise<MeasurementType | null>
  archive(
    familyId: string,
    typeId: string,
    status: MeasurementTypeStatus,
  ): Promise<MeasurementType | null>
}
