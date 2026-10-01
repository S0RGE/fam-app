import { z } from 'zod'
import { measurementQuerySchema } from '../../../../../../application/dto/measurement'
import { MeasurementService } from '../../../../../../application/measurements/measurement-service'
import { SupabaseMeasurementRepository } from '../../../../../../infrastructure/supabase/measurement-repository'
import { SupabaseMeasurementTypeRepository } from '../../../../../../infrastructure/supabase/measurement-type-repository'
import { SupabasePersonRepository } from '../../../../../../infrastructure/supabase/person-repository'
import { defineApiHandler } from '../../../../../utils/api-handler'
import { requireFamily } from '../../../../../utils/family-context'
import { noStore } from '../../../../../utils/api-response'
import { validate } from '../../../../../utils/request-validation'

export default defineApiHandler(async (event) => {
  noStore(event)
  const personId = validate(
    getRouterParam(event, 'personId'),
    z.string().uuid(),
  )
  const params = new URLSearchParams(getRequestURL(event).search)
  const allowed = new Set(['limit', 'offset', 'from', 'to', 'typeId'])
  for (const key of params.keys())
    if (!allowed.has(key) || params.getAll(key).length !== 1)
      throw createError({
        statusCode: 400,
        data: {
          code: 'VALIDATION_ERROR',
          fields: { query: 'Недопустимые параметры' },
        },
      })
  const input = validate(Object.fromEntries(params), measurementQuerySchema)
  const { family, supabase } = await requireFamily(event)
  if (!(await new SupabasePersonRepository(supabase).get(family.id, personId)))
    throw createError({
      statusCode: 404,
      statusMessage: 'Член семьи не найден',
    })
  const result = await new MeasurementService(
    new SupabaseMeasurementRepository(supabase),
    new SupabaseMeasurementTypeRepository(supabase),
  ).list(family.id, personId, input)
  return { data: result.measurements, meta: { ...input, total: result.total } }
})
