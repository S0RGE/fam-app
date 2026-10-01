import { defineApiHandler } from '../../../utils/api-handler'
import { createFamilySchema } from '../../../../application/dto/family'
import { validateBody } from '../../../utils/request-validation'
import { requireAccount } from '../../../utils/auth-context'
import { SupabaseFamilyRepository } from '../../../../infrastructure/supabase/family-repository'
import { requireSameOrigin } from '../../../utils/csrf'
import { noStore } from '../../../utils/api-response'
export default defineApiHandler(async (event) => {
  noStore(event)
  requireSameOrigin(event)
  const input = await validateBody(event, createFamilySchema)
  const account = await requireAccount(event)
  const family = await new SupabaseFamilyRepository(account.supabase).setup(
    account.id,
    input.name,
  )
  if (family === 'already_configured')
    throw createError({
      statusCode: 409,
      data: { code: 'FAMILY_ALREADY_CONFIGURED' },
    })
  return { data: family }
})
