import { defineApiHandler } from '../../../../utils/api-handler'
import { z } from 'zod'
import { validate } from '../../../../utils/request-validation'
import { requireFamily } from '../../../../utils/family-context'
import { SupabasePersonRepository } from '../../../../../infrastructure/supabase/person-repository'
import { SupabaseMedicalProfileRepository } from '../../../../../infrastructure/supabase/medical-profile-repository'
import { MedicalProfileService } from '../../../../../application/medical-profiles/medical-profile-service'
import { noStore } from '../../../../utils/api-response'
export default defineApiHandler(async (event) => {
  noStore(event)
  const id = validate(getRouterParam(event, 'personId'), z.string().uuid())
  const { family, supabase } = await requireFamily(event)
  if (!(await new SupabasePersonRepository(supabase).get(family.id, id)))
    throw createError({ statusCode: 404 })
  const profile = await new MedicalProfileService(
    new SupabaseMedicalProfileRepository(supabase),
  ).get(family.id, id)
  return { data: { profile } }
})
