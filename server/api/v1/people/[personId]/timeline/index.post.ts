import { defineApiHandler } from '../../../../../utils/api-handler'
import { z } from 'zod'
import { medicalEventCreateSchema } from '../../../../../../application/dto/medical-event'
import { validate, validateBody } from '../../../../../utils/request-validation'
import { requireFamily } from '../../../../../utils/family-context'
import { SupabasePersonRepository } from '../../../../../../infrastructure/supabase/person-repository'
import { SupabaseMedicalEventRepository } from '../../../../../../infrastructure/supabase/medical-event-repository'
import { MedicalEventService } from '../../../../../../application/timeline/medical-event-service'
import { requireSameOrigin } from '../../../../../utils/csrf'
import { noStore } from '../../../../../utils/api-response'
import { throwMedicalEventMutationError } from '../../../../../utils/medical-event-api-error'
export default defineApiHandler(async (event) => {
  noStore(event)
  requireSameOrigin(event)
  const personId = validate(
    getRouterParam(event, 'personId'),
    z.string().uuid(),
  )
  const input = await validateBody(event, medicalEventCreateSchema)
  const { family, supabase, id: authorId } = await requireFamily(event)
  if (!(await new SupabasePersonRepository(supabase).get(family.id, personId)))
    throw createError({
      statusCode: 404,
      statusMessage: 'Член семьи не найден',
    })
  try {
    return {
      data: await new MedicalEventService(
        new SupabaseMedicalEventRepository(supabase),
      ).create(family.id, personId, input, authorId),
    }
  } catch (error) {
    throwMedicalEventMutationError(error)
  }
})
