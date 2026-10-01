import { z } from 'zod'
import { measurementCreateSchema } from '../../../../../../application/dto/measurement'
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
  const input = await validateBody(event, measurementCreateSchema)
  const { family, supabase } = await requireFamily(event)
  if (!(await new SupabasePersonRepository(supabase).get(family.id, personId)))
    throw createError({
      statusCode: 404,
      statusMessage: 'Член семьи не найден',
    })
  try {
    return {
      data: await new MeasurementService(
        new SupabaseMeasurementRepository(supabase),
        new SupabaseMeasurementTypeRepository(supabase),
      ).create(family.id, personId, input),
    }
  } catch (error) {
    throwMeasurementMutationError(error)
  }
})
