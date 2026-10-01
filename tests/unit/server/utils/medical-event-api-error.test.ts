import { afterEach, describe, expect, it, vi } from 'vitest'
import { NoteNotEditableError } from '../../../../application/timeline/medical-event-service'
import { throwMedicalEventMutationError } from '../../../../server/utils/medical-event-api-error'

const providerError = (code: string) => ({ code, message: 'provider detail' })

function capturedErrors() {
  const captured: Array<{
    statusCode?: number
    statusMessage?: string
    data?: unknown
  }> = []
  // Nitro auto-imports are not available under plain vitest; the mapper only
  // needs the stable envelope fields.
  vi.stubGlobal('createError', (options: unknown) => {
    const opts = options as {
      statusCode?: number
      statusMessage?: string
      data?: unknown
    }
    captured.push(opts)
    const error = new Error(opts?.statusMessage ?? 'api-error') as Error & {
      statusCode?: number
      statusMessage?: string
      data?: unknown
    }
    error.statusCode = opts?.statusCode
    error.statusMessage = opts?.statusMessage
    error.data = opts?.data
    return error
  })
  return captured
}

describe('throwMedicalEventMutationError', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('maps NoteNotEditableError to 409 NOT_EDITABLE', () => {
    const captured = capturedErrors()
    expect(() =>
      throwMedicalEventMutationError(new NoteNotEditableError()),
    ).toThrowError(
      expect.objectContaining({
        statusCode: 409,
        statusMessage: 'Запись не поддерживает редактирование',
      }),
    )
    expect(captured[0]).toEqual({
      statusCode: 409,
      statusMessage: 'Запись не поддерживает редактирование',
      data: { code: 'NOT_EDITABLE' },
    })
  })

  it('maps a broken episode foreign key to a safe 404', () => {
    const captured = capturedErrors()
    expect(() =>
      throwMedicalEventMutationError(providerError('23503')),
    ).toThrowError(expect.objectContaining({ statusCode: 404 }))
    expect(captured[0]).toEqual({
      statusCode: 404,
      statusMessage: 'Эпизод не найден',
    })
  })

  it('maps state conflicts (22023/23514) and NOT NULL violations (23502) to 409', () => {
    const captured = capturedErrors()
    for (const code of ['23514', '22023', '23502']) {
      try {
        throwMedicalEventMutationError(providerError(code))
      } catch (error) {
        expect(error).toMatchObject({ statusCode: 409 })
      }
    }
    expect(captured.length).toBe(3)
    expect(captured.map((e) => e.statusMessage)).toEqual([
      'Конфликт состояния',
      'Конфликт состояния',
      'Конфликт состояния',
    ])
  })

  it('maps a missing person (P0002) to a safe 404', () => {
    const captured = capturedErrors()
    expect(() =>
      throwMedicalEventMutationError(providerError('P0002')),
    ).toThrowError(expect.objectContaining({ statusCode: 404 }))
    expect(captured[0]).toEqual({
      statusCode: 404,
      statusMessage: 'Ресурс не найден',
    })
  })

  it('rethrows unknown provider errors so the handler answers with a generic 500', () => {
    capturedErrors()
    const unknown = new Error('internal detail')
    expect(() => throwMedicalEventMutationError(unknown)).toThrow(unknown)
  })

  it('never leaks provider details into the mapped envelope', () => {
    const captured = capturedErrors()
    expect(() =>
      throwMedicalEventMutationError(providerError('23503')),
    ).toThrowError(
      expect.objectContaining({
        statusMessage: 'Эпизод не найден',
      }),
    )
    expect(JSON.stringify(captured)).not.toContain('provider detail')
  })
})
