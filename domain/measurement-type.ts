import type { FamilyId } from './shared'

export type MeasurementValueType =
  'number' | 'text' | 'boolean' | 'compound' | 'image'

export type MeasurementTypeStatus = 'active' | 'archived'

export interface MeasurementType {
  id: string
  familyId: FamilyId
  name: string
  category: string
  description: string | null
  valueType: MeasurementValueType
  unit: string | null
  allowedUnits: string[]
  status: MeasurementTypeStatus
  isPreset: boolean
  createdAt: string
  updatedAt: string
}
