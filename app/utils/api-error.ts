type UnknownRecord = Record<string, unknown>

export type ParsedApiError = {
  statusCode: number | undefined
  code: string | undefined
  fields: Record<string, string>
}

function asRecord(value: unknown): UnknownRecord | undefined {
  return typeof value === 'object' && value !== null
    ? (value as UnknownRecord)
    : undefined
}

function readStatus(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readFields(value: unknown): Record<string, string> {
  const source = asRecord(value)
  if (!source) return {}
  return Object.fromEntries(
    Object.entries(source).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
}

/**
 * Нормализует ошибку `$fetch` на границе представления.
 *
 * Основной контракт `/api/v1` — `{ error: { code, fields } }`. Две запасные
 * формы покрывают H3 `createError`, если ошибка перехвачена до API-mapper или
 * сериализована стандартным обработчиком Nitro.
 */
export function parseApiError(cause: unknown): ParsedApiError {
  const error = asRecord(cause)
  const body = asRecord(error?.data)
  const stableEnvelope = asRecord(body?.error)
  const serializedCreateError = asRecord(body?.data)
  const details = stableEnvelope || serializedCreateError || body

  return {
    statusCode:
      readStatus(error?.statusCode) ||
      readStatus(error?.status) ||
      readStatus(body?.statusCode),
    code: typeof details?.code === 'string' ? details.code : undefined,
    fields: readFields(details?.fields),
  }
}
