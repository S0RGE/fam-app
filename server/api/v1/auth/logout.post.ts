import { defineApiHandler } from '../../../utils/api-handler'
import { requireAccount } from '../../../utils/auth-context'
import { SupabaseAuthProvider } from '../../../../infrastructure/supabase/auth-provider'
import { requireSameOrigin } from '../../../utils/csrf'
import { noStore } from '../../../utils/api-response'
export default defineApiHandler(async (event) => {
  noStore(event)
  requireSameOrigin(event)
  const { supabase } = await requireAccount(event)
  await new SupabaseAuthProvider(supabase).signOut()
  return { data: { authenticated: false } }
})
