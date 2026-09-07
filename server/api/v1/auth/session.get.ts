import { defineApiHandler } from '../../../utils/api-handler'
import { SupabaseAuthProvider } from '../../../../infrastructure/supabase/auth-provider'
import { SupabaseFamilyRepository } from '../../../../infrastructure/supabase/family-repository'
import { getSupabase } from '../../../utils/supabase'
import { noStore } from '../../../utils/api-response'
export default defineApiHandler(async (event) => {
  noStore(event)
  const client = getSupabase(event)
  const account = await new SupabaseAuthProvider(client).getAccount()
  const setupRequired =
    !!account &&
    !(await new SupabaseFamilyRepository(client).getForAccount(account.id))
  return { data: { authenticated: !!account, setupRequired } }
})
