import type { H3Event } from 'h3'
import { requireAccount } from './auth-context'
import { SupabaseFamilyRepository } from '../../infrastructure/supabase/family-repository'
export async function requireFamily(event: H3Event) {
  const account = await requireAccount(event)
  const family = await new SupabaseFamilyRepository(
    account.supabase,
  ).getForAccount(account.id)
  if (!family)
    throw createError({ statusCode: 404, statusMessage: 'Ресурс не найден' })
  return { ...account, family }
}
