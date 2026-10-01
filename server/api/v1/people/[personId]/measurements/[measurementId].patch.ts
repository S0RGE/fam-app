import { z } from 'zod'
import { measurementUpdateSchema } from '../../../../../../application/dto/measurement'
import { MeasurementService } from '../../../../../../application/measurements/measurement-service'
import { SupabaseMeasurementRepository } from '../../../../../../infrastructure/supabase/measurement-repository'
import { SupabaseMeasurementTypeRepository } from '../../../../../../infrastructure/supabase/measurement-type-repository'
import { SupabasePersonRepository } from '../../../../../../infrastructure/supabase/person-repository'
import { defineApiHandler } from '../../../../../utils/api-handler'
import { requireSameOrigin } from '../../../../../utils/csrf'
import { requireFamily } from '../../../../../utils/family-context'
import { noStore } from '../../../../../utils/api-response'
import { throwMeasurementMutationError } from '../../../../../utils/measurement-api-error'
import { validate, validateBody } from '../../../../../utils/request-validation'

export default defineApiHandler(async (event) => {
  noStore(event)
  requireSameOrigin(event)
  const personId = validate(
    getRouterParam(event, 'personId'),
    z.string().uuid(),
  )
  const measurementId = validate(
    getRouterParam(event, 'measurementId'),
    z.string().uuid(),
  )
  const input = await validateBody(event, measurementUpdateSchema)
  const { family, supabase } = await requireFamily(event)
  if (!(await new SupabasePersonRepository(supabase).get(family.id, personId)))
    throw createError({
      statusCode: 404,
      statusMessage: 'Член семьи не найден',
    })
  try {
    const updated = await new MeasurementService(
      new SupabaseMeasurementRepository(supabase),
      new SupabaseMeasurementTypeRepository(supabase),
    ).update(family.id, personId, measurementId, input)
    if (!updated)
      throw createError({
        statusCode: 404,
        statusMessage: 'Измерение не найдено',
      })
    return { data: updated }
  } catch (error) {
    throwMeasurementMutationError(error)
  }
})
