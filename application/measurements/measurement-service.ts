import type { Measurement } from '../../domain/measurement'
import type { MeasurementValueType } from '../../domain/measurement-type'
import type {
  MeasurementCreateInput,
  MeasurementListInput,
  MeasurementRepository,
  MeasurementUpdateInput,
} from '../../ports/measurement-repository'
import type { MeasurementTypeRepository } from '../../ports/measurement-type-repository'
import { measurementDto } from '../dto/measurement'

export class MeasurementValueConflictError extends Error {
  constructor(message = 'Значение не соответствует типу показателя') {
    super(message)
    this.name = 'MeasurementValueConflictError'
  }
}

export class MeasurementTypeNotFoundError extends Error {
  constructor() {
    super('Тип показателя не найден')
    this.name = 'MeasurementTypeNotFoundError'
  }
}

export interface MeasurementCreateCommand {
  measurementTypeId: string
  occurredAt: string
  numericValue?: number | null
  textValue?: string | null
  booleanValue?: boolean | null
  compoundValue?: { systolic: number; diastolic: number } | null
  unit?: string | null
  comment?: string | null
  episodeId?: string | null
}

const validateValue = (
  valueType: MeasurementValueType,
  values: Pick<
    MeasurementCreateInput,
    'numericValue' | 'textValue' | 'booleanValue' | 'compoundValue'
  >,
) => {
  const present = {
    number: values.numericValue !== null,
    text: values.textValue !== null,
    boolean: values.booleanValue !== null,
    compound: values.compoundValue !== null,
  }
  if (valueType === 'image') throw new MeasurementValueConflictError()
  if (!present[valueType]) throw new MeasurementValueConflictError()
  if (Object.values(present).filter(Boolean).length !== 1)
    throw new MeasurementValueConflictError()
}

const validateUnit = (
  unit: string | null,
  primaryUnit: string | null,
  allowedUnits: string[],
) => {
  if (unit !== null && unit !== primaryUnit && !allowedUnits.includes(unit))
    throw new MeasurementValueConflictError(
      'Единица измерения не поддерживается типом показателя',
    )
}

const currentValues = (measurement: Measurement) => ({
  numericValue: measurement.numericValue,
  textValue: measurement.textValue,
  booleanValue: measurement.booleanValue,
  compoundValue: measurement.compoundValue,
})

export class MeasurementService {
  constructor(
    private readonly measurements: MeasurementRepository,
    private readonly types: MeasurementTypeRepository,
  ) {}

  async list(familyId: string, personId: string, input: MeasurementListInput) {
    const result = await this.measurements.list(familyId, personId, input)
    return {
      measurements: result.measurements.map(measurementDto),
      total: result.total,
    }
  }

  async get(familyId: string, personId: string, measurementId: string) {
    const measurement = await this.measurements.get(
      familyId,
      personId,
      measurementId,
    )
    return measurement && measurementDto(measurement)
  }

  async create(
    familyId: string,
    personId: string,
    input: MeasurementCreateCommand,
  ) {
    const type = await this.types.get(familyId, input.measurementTypeId)
    if (!type || type.status !== 'active')
      throw new MeasurementTypeNotFoundError()

    const payload: MeasurementCreateInput = {
      measurementTypeId: input.measurementTypeId,
      occurredAt: input.occurredAt,
      numericValue: input.numericValue ?? null,
      textValue: input.textValue ?? null,
      booleanValue: input.booleanValue ?? null,
      compoundValue: input.compoundValue ?? null,
      unit: input.unit ?? null,
      comment: input.comment ?? null,
      episodeId: input.episodeId ?? null,
      source: 'manual',
    }
    validateValue(type.valueType, payload)
    validateUnit(payload.unit, type.unit, type.allowedUnits)
    return measurementDto(
      await this.measurements.create(familyId, personId, payload),
    )
  }

  async update(
    familyId: string,
    personId: string,
    measurementId: string,
    input: MeasurementUpdateInput,
  ) {
    const current = await this.measurements.get(
      familyId,
      personId,
      measurementId,
    )
    if (!current) return null
    const type = await this.types.get(familyId, current.measurementTypeId)
    if (!type) throw new MeasurementTypeNotFoundError()

    const values = currentValues(current)
    if (input.numericValue !== undefined)
      values.numericValue = input.numericValue
    if (input.textValue !== undefined) values.textValue = input.textValue
    if (input.booleanValue !== undefined)
      values.booleanValue = input.booleanValue
    if (input.compoundValue !== undefined)
      values.compoundValue = input.compoundValue
    const unit = input.unit === undefined ? current.unit : input.unit
    validateValue(type.valueType, values)
    validateUnit(unit, type.unit, type.allowedUnits)

    const updated = await this.measurements.update(
      familyId,
      personId,
      measurementId,
      input,
    )
    return updated && measurementDto(updated)
  }

  delete(familyId: string, personId: string, measurementId: string) {
    return this.measurements.delete(familyId, personId, measurementId)
  }
}
