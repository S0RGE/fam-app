import type {
  CompoundMeasurementValue,
  Measurement,
} from '../domain/measurement'
import type { MedicalEventSource } from '../domain/medical-event'

export interface MeasurementListInput {
  limit: number
  offset: number
  from?: string
  to?: string
  typeId?: string
}

export interface MeasurementCreateInput {
  measurementTypeId: string
  episodeId: string | null
  occurredAt: string
  numericValue: number | null
  textValue: string | null
  booleanValue: boolean | null
  compoundValue: CompoundMeasurementValue | null
  unit: string | null
  comment: string | null
  source: MedicalEventSource
}

export interface MeasurementUpdateInput {
  episodeId?: string | null
  occurredAt?: string
  numericValue?: number | null
  textValue?: string | null
  booleanValue?: boolean | null
  compoundValue?: CompoundMeasurementValue | null
  unit?: string | null
  comment?: string | null
}

export interface MeasurementRepository {
  list(
    familyId: string,
    personId: string,
    input: MeasurementListInput,
  ): Promise<{ measurements: Measurement[]; total: number }>
  get(
    familyId: string,
    personId: string,
    measurementId: string,
  ): Promise<Measurement | null>
  create(
    familyId: string,
    personId: string,
    input: MeasurementCreateInput,
  ): Promise<Measurement>
  update(
    familyId: string,
    personId: string,
    measurementId: string,
    input: MeasurementUpdateInput,
  ): Promise<Measurement>
  delete(
    familyId: string,
    personId: string,
    measurementId: string,
  ): Promise<boolean>
}
