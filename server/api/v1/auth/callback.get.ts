import { defineApiHandler } from '../../../utils/api-handler'
import { getSupabase } from '../../../utils/supabase'
export default defineApiHandler(async (event) => {
  const code = getQuery(event).code
  if (typeof code !== 'string' || !code)
    return sendRedirect(event, '/login?error=auth', 302)
  const { error } = await getSupabase(event).auth.exchangeCodeForSession(code)
  return sendRedirect(event, error ? '/login?error=auth' : '/reset', 302)
})
