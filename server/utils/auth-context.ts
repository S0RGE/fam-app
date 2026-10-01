import type { H3Event } from 'h3'
import { getSupabase } from './supabase'
export async function requireAccount(event: H3Event) {
  const supabase = getSupabase(event)
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  const id = claims?.sub
  const email = claims?.email
  if (error || typeof id !== 'string')
    throw createError({
      statusCode: 401,
      statusMessage: 'Требуется авторизация',
    })
  return { id, email: typeof email === 'string' ? email : null, supabase }
}
