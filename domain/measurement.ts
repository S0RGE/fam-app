import type { FamilyId, PersonId } from './shared'
import type { MedicalEventSource } from './medical-event'

export interface CompoundMeasurementValue {
  systolic: number
  diastolic: number
}

export interface Measurement {
  id: string
  familyId: FamilyId
  personId: PersonId
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
  createdAt: string
  updatedAt: string
}
