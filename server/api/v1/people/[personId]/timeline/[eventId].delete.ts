import { defineApiHandler } from '../../../../../utils/api-handler'
import { z } from 'zod'
import { validate } from '../../../../../utils/request-validation'
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
  const { family, supabase } = await requireFamily(event)
  if (!(await new SupabasePersonRepository(supabase).get(family.id, personId)))
    throw createError({
      statusCode: 404,
      statusMessage: 'Член семьи не найден',
    })
  try {
    const deleted = await new MedicalEventService(
      new SupabaseMedicalEventRepository(supabase),
    ).delete(family.id, personId, eventId)
    if (!deleted)
      throw createError({
        statusCode: 404,
        statusMessage: 'Событие не найдено',
      })
    return { data: { id: eventId } }
  } catch (error) {
    throwMedicalEventMutationError(error)
  }
})
