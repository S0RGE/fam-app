import type { H3Event } from 'h3'
import { createApiError } from './api-error'
export function noStore(event: H3Event) {
  setResponseHeader(event, 'Cache-Control', 'no-store')
}
export function mapApiError(error: unknown, requestId: string) {
  const status =
    typeof error === 'object' && error && 'statusCode' in error
      ? Number(error.statusCode)
      : 500
  const rawData =
    typeof error === 'object' && error && 'data' in error ? error.data : null
  const data =
    rawData && typeof rawData === 'object'
      ? (rawData as { code?: string; fields?: Record<string, string> })
      : {}
  const code =
    data.code ||
    (
      {
        400: 'VALIDATION_ERROR',
        401: 'UNAUTHENTICATED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        409: 'CONFLICT',
        429: 'AUTH_RATE_LIMITED',
        503: 'SERVICE_UNAVAILABLE',
      } as Record<number, string>
    )[status] ||
    'INTERNAL_ERROR'
  const message =
    (
      {
        400: 'Проверьте заполненные поля',
        401: 'Требуется авторизация',
        403: 'Запрос отклонён',
        404: 'Ресурс не найден',
        409: 'Конфликт состояния',
        429: 'Слишком много запросов',
        503: 'Сервис временно недоступен',
      } as Record<number, string>
    )[status] || 'Не удалось выполнить запрос'
  return { status, body: createApiError(code, message, requestId, data.fields) }
}
export function apiError(event: H3Event, error: unknown) {
  noStore(event)
  const id = event.context.requestId
  const mapped = mapApiError(
    error,
    typeof id === 'string'
      ? id
      : getRequestHeader(event, 'x-request-id') || 'unknown',
  )
  setResponseStatus(event, mapped.status)
  return mapped.body
}
