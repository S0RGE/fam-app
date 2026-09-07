import { defineApiHandler } from '../../../utils/api-handler'
import { resetSchema } from '../../../../application/dto/auth'
import { validateBody } from '../../../utils/request-validation'
import { requireAccount } from '../../../utils/auth-context'
import { SupabaseAuthProvider } from '../../../../infrastructure/supabase/auth-provider'
import { requireSameOrigin } from '../../../utils/csrf'
import { noStore } from '../../../utils/api-response'
export default defineApiHandler(async (event) => {
  noStore(event)
  requireSameOrigin(event)
  const input = await validateBody(event, resetSchema)
  const { supabase } = await requireAccount(event)
  await new SupabaseAuthProvider(supabase).resetPassword(input.password)
  return { data: { authenticated: true, setupRequired: false } }
})
