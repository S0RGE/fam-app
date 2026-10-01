import { NoteNotEditableError } from '../../application/timeline/medical-event-service'

/**
 * Maps provider (PostgREST/Postgres) error codes of the medical_events
 * mutations to stable safe API errors. Unknown provider errors are rethrown
 * as-is and become a generic 500 envelope (no internals are leaked).
 */
export function throwMedicalEventMutationError(error: unknown): never {
  if (error instanceof NoteNotEditableError)
    throw createError({
      statusCode: 409,
      statusMessage: error.message,
      data: { code: 'NOT_EDITABLE' },
    })
  const code =
    typeof error === 'object' && error && 'code' in error
      ? (error as object & { code?: unknown }).code
      : undefined
  if (code === '23503')
    throw createError({
      statusCode: 404,
      statusMessage: 'Эпизод не найден',
    })
  if (code === '23514' || code === '22023' || code === '23502')
    throw createError({
      statusCode: 409,
      statusMessage: 'Конфликт состояния',
    })
  if (code === 'P0002')
    throw createError({
      statusCode: 404,
      statusMessage: 'Ресурс не найден',
    })
  throw error
}
