import { defineApiHandler } from '../../../utils/api-handler'
import { SupabaseAuthProvider } from '../../../../infrastructure/supabase/auth-provider'
import { recoverySchema } from '../../../../application/dto/auth'
import { getSupabase } from '../../../utils/supabase'
import { validateBody } from '../../../utils/request-validation'
import { noStore } from '../../../utils/api-response'
import { normalizeAppOrigin, requireSameOrigin } from '../../../utils/csrf'
export default defineApiHandler(async (event) => {
  noStore(event)
  requireSameOrigin(event)
  const input = await validateBody(event, recoverySchema)
  const base = normalizeAppOrigin(useRuntimeConfig(event).appBaseUrl)
  if (!base)
    throw createError({
      statusCode: 503,
      statusMessage: 'Сервис авторизации не настроен',
    })
  const result = await new SupabaseAuthProvider(
    getSupabase(event),
  ).requestRecovery(input.email, `${base}/api/v1/auth/callback`)
  if (result === 'rate_limited')
    throw createError({ statusCode: 429, data: { code: 'AUTH_RATE_LIMITED' } })
  setResponseStatus(event, 202)
  return { data: { accepted: true } }
})
