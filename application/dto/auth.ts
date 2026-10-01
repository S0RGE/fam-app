import { z } from 'zod'

export const loginSchema = z
  .object({ email: z.string().trim().email(), password: z.string().min(1) })
  .strict()
export const recoverySchema = z
  .object({ email: z.string().trim().email() })
  .strict()
// Supabase currently requires a minimum of six characters; keep validation provider-compatible.
export const resetSchema = z
  .object({ password: z.string().min(6).max(72) })
  .strict()
export interface SessionDto {
  authenticated: boolean
  setupRequired: boolean
}
