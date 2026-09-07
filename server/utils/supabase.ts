import { createServerClient } from '@supabase/ssr'
import type { H3Event } from 'h3'

function requestCookies(event: H3Event) {
  return (getRequestHeader(event, 'cookie') || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const index = part.indexOf('=')
      return {
        name: decodeURIComponent(part.slice(0, index)),
        value: decodeURIComponent(part.slice(index + 1)),
      }
    })
}
export function getSupabase(event: H3Event) {
  const config = useRuntimeConfig(event)
  if (!config.supabaseUrl || !config.supabaseAnonKey)
    throw createError({
      statusCode: 503,
      statusMessage: 'Сервис авторизации не настроен',
    })
  return createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
    cookies: {
      getAll: () => requestCookies(event),
      setAll: (cookies) =>
        cookies.forEach((cookie) =>
          setCookie(event, cookie.name, cookie.value, {
            ...cookie.options,
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            secure: process.env.NODE_ENV === 'production',
          }),
        ),
    },
  })
}
