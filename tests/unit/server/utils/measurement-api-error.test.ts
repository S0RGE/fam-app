import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MeasurementTypeNotFoundError,
  MeasurementValueConflictError,
} from '../../../../application/measurements/measurement-service'
import { PresetNotEditableError } from '../../../../application/measurements/measurement-type-service'
import {
  throwMeasurementMutationError,
  throwMeasurementTypeMutationError,
} from '../../../../server/utils/measurement-api-error'

const providerError = (code: string) => ({ code, message: 'private detail' })

function stubCreateError() {
  vi.stubGlobal('createError', (options: unknown) => {
    const value = options as { statusCode?: number; data?: unknown }
    return Object.assign(new Error('api-error'), value)
  })
}

describe('measurement API error mapping', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('maps immutable presets and duplicate active types to stable 409 codes', () => {
    stubCreateError()
    expect(() =>
      throwMeasurementTypeMutationError(new PresetNotEditableError()),
    ).toThrowError(
      expect.objectContaining({
        statusCode: 409,
        data: { code: 'PRESET_NOT_EDITABLE' },
      }),
    )
    expect(() =>
      throwMeasurementTypeMutationError(providerError('23505')),
    ).toThrowError(
      expect.objectContaining({
        statusCode: 409,
        data: { code: 'DUPLICATE_TYPE' },
      }),
    )
    expect(() =>
      throwMeasurementTypeMutationError(providerError('P1001')),
    ).toThrowError(
      expect.objectContaining({
        statusCode: 409,
        data: { code: 'TYPE_IN_USE' },
      }),
    )
  })

  it('maps missing resources to 404 and value/database conflicts to safe 409', () => {
    stubCreateError()
    for (const error of [
      new MeasurementTypeNotFoundError(),
      providerError('23503'),
      providerError('P0002'),
    ])
      expect(() => throwMeasurementMutationError(error)).toThrowError(
        expect.objectContaining({ statusCode: 404 }),
      )

    for (const error of [
      new MeasurementValueConflictError(),
      providerError('22023'),
      providerError('23514'),
      providerError('23502'),
    ])
      expect(() => throwMeasurementMutationError(error)).toThrowError(
        expect.objectContaining({
          statusCode: 409,
          data: { code: 'CONFLICT' },
        }),
      )
  })

  it('rethrows unknown errors without exposing provider details', () => {
    stubCreateError()
    const unknown = providerError('XX000')
    expect(() => throwMeasurementMutationError(unknown)).toThrow(unknown)
    expect(() => throwMeasurementTypeMutationError(unknown)).toThrow(unknown)
  })
})
