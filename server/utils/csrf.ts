import type { H3Event } from 'h3'
export function normalizeAppOrigin(value: string | undefined) {
  try {
    if (!value) return null
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.origin
  } catch {
    return null
  }
}
export function isAllowedOrigin(
  origin: string | undefined,
  base: string | undefined,
) {
  return !!origin && origin === normalizeAppOrigin(base)
}
export function requireSameOrigin(event: H3Event) {
  if (
    !isAllowedOrigin(
      getRequestHeader(event, 'origin'),
      useRuntimeConfig(event).appBaseUrl,
    )
  )
    throw createError({
      statusCode: 403,
      statusMessage: 'Запрос отклонён',
      data: { code: 'ORIGIN_FORBIDDEN' },
    })
}
