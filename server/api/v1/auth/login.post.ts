import { defineApiHandler } from '../../../utils/api-handler'
import { SupabaseAuthProvider } from '../../../../infrastructure/supabase/auth-provider'
import { loginSchema } from '../../../../application/dto/auth'
import { getSupabase } from '../../../utils/supabase'
import { validateBody } from '../../../utils/request-validation'
import { noStore } from '../../../utils/api-response'
import { SupabaseFamilyRepository } from '../../../../infrastructure/supabase/family-repository'
import { requireSameOrigin } from '../../../utils/csrf'
export default defineApiHandler(async (event) => {
  noStore(event)
  requireSameOrigin(event)
  const input = await validateBody(event, loginSchema)
  const client = getSupabase(event)
  const auth = new SupabaseAuthProvider(client)
  const result = await auth.signIn(input.email, input.password)
  if (result === 'rate_limited')
    throw createError({ statusCode: 429, data: { code: 'AUTH_RATE_LIMITED' } })
  if (result === 'invalid')
    throw createError({
      statusCode: 401,
      data: { code: 'INVALID_CREDENTIALS' },
    })
  const account = await auth.getAccount()
  return {
    data: {
      authenticated: true,
      setupRequired: !(
        account &&
        (await new SupabaseFamilyRepository(client).getForAccount(account.id))
      ),
    },
  }
})
