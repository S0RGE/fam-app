import { defineApiHandler } from '../../../../../utils/api-handler'
import { z } from 'zod'
import { medicalEventQuerySchema } from '../../../../../../application/dto/medical-event'
import { validate } from '../../../../../utils/request-validation'
import { requireFamily } from '../../../../../utils/family-context'
import { SupabasePersonRepository } from '../../../../../../infrastructure/supabase/person-repository'
import { SupabaseMedicalEventRepository } from '../../../../../../infrastructure/supabase/medical-event-repository'
import { MedicalEventService } from '../../../../../../application/timeline/medical-event-service'
import { noStore } from '../../../../../utils/api-response'
export default defineApiHandler(async (event) => {
  noStore(event)
  const personId = validate(
    getRouterParam(event, 'personId'),
    z.string().uuid(),
  )
  const params = new URLSearchParams(getRequestURL(event).search)
  const allowed = new Set([
    'limit',
    'offset',
    'from',
    'to',
    'type',
    'episodeId',
  ])
  for (const key of params.keys())
    if (!allowed.has(key) || params.getAll(key).length !== 1)
      throw createError({
        statusCode: 400,
        data: {
          code: 'VALIDATION_ERROR',
          fields: { query: 'Недопустимые параметры' },
        },
      })
  const input = validate(Object.fromEntries(params), medicalEventQuerySchema)
  const { family, supabase } = await requireFamily(event)
  if (!(await new SupabasePersonRepository(supabase).get(family.id, personId)))
    throw createError({
      statusCode: 404,
      statusMessage: 'Член семьи не найден',
    })
  const result = await new MedicalEventService(
    new SupabaseMedicalEventRepository(supabase),
  ).list(family.id, personId, input)
  return { data: result.events, meta: { ...input, total: result.total } }
})
