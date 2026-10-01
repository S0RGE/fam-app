import {
  MeasurementTypeNotFoundError,
  MeasurementValueConflictError,
} from '../../application/measurements/measurement-service'
import { PresetNotEditableError } from '../../application/measurements/measurement-type-service'

const providerCode = (error: unknown) =>
  typeof error === 'object' && error && 'code' in error
    ? (error as object & { code?: unknown }).code
    : undefined

export function throwMeasurementTypeMutationError(error: unknown): never {
  if (error instanceof PresetNotEditableError)
    throw createError({
      statusCode: 409,
      data: { code: 'PRESET_NOT_EDITABLE' },
    })
  if (providerCode(error) === '23505')
    throw createError({
      statusCode: 409,
      data: { code: 'DUPLICATE_TYPE' },
    })
  if (providerCode(error) === 'P1001')
    throw createError({
      statusCode: 409,
      data: { code: 'TYPE_IN_USE' },
    })
  if (providerCode(error) === 'P0002') throw createError({ statusCode: 404 })
  if (
    ['23503', '23514', '23502', '22023'].includes(String(providerCode(error)))
  )
    throw createError({ statusCode: 409, data: { code: 'CONFLICT' } })
  throw error
}

export function throwMeasurementMutationError(error: unknown): never {
  if (error instanceof MeasurementTypeNotFoundError)
    throw createError({ statusCode: 404 })
  if (error instanceof MeasurementValueConflictError)
    throw createError({
      statusCode: 409,
      data: { code: 'CONFLICT' },
    })
  if (providerCode(error) === '23503' || providerCode(error) === 'P0002')
    throw createError({ statusCode: 404 })
  if (['23514', '23502', '22023'].includes(String(providerCode(error))))
    throw createError({
      statusCode: 409,
      data: { code: 'CONFLICT' },
    })
  throw error
}
