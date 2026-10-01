import { defineApiHandler } from '../../../../../utils/api-handler'
import { z } from 'zod'
import { medicalEventUpdateSchema } from '../../../../../../application/dto/medical-event'
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
  const eventId = validate(getRouterParam(event, 'eventId'), z.string().uuid())
  const input = await validateBody(event, medicalEventUpdateSchema)
  const { family, supabase } = await requireFamily(event)
  if (!(await new SupabasePersonRepository(supabase).get(family.id, personId)))
    throw createError({
      statusCode: 404,
      statusMessage: 'Член семьи не найден',
    })
  try {
    const updated = await new MedicalEventService(
      new SupabaseMedicalEventRepository(supabase),
    ).update(family.id, personId, eventId, input)
    if (!updated)
      throw createError({
        statusCode: 404,
        statusMessage: 'Событие не найдено',
      })
    return { data: updated }
  } catch (error) {
    throwMedicalEventMutationError(error)
  }
})
