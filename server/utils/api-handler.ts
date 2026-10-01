import type { H3Event, EventHandler } from 'h3'
import { apiError } from './api-response'
export function defineApiHandler<T>(
  handler: (event: H3Event) => Promise<T> | T,
): EventHandler {
  return defineEventHandler(async (event) => {
    try {
      return await handler(event)
    } catch (error) {
      return apiError(event, error)
    }
  })
}
