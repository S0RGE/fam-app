import { defineApiHandler } from '../../../utils/api-handler'
import { requireAccount } from '../../../utils/auth-context'
import { SupabaseFamilyRepository } from '../../../../infrastructure/supabase/family-repository'
import { noStore } from '../../../utils/api-response'
export default defineApiHandler(async (event) => {
  noStore(event)
  const account = await requireAccount(event)
  const family = await new SupabaseFamilyRepository(
    account.supabase,
  ).getForAccount(account.id)
  return { data: { family, setupRequired: !family } }
})
