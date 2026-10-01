import { z } from 'zod'
import { measurementTypeUpdateSchema } from '../../../../../application/dto/measurement-type'
import { MeasurementTypeService } from '../../../../../application/measurements/measurement-type-service'
import { SupabaseMeasurementTypeRepository } from '../../../../../infrastructure/supabase/measurement-type-repository'
import { defineApiHandler } from '../../../../utils/api-handler'
import { requireSameOrigin } from '../../../../utils/csrf'
import { requireFamily } from '../../../../utils/family-context'
import { noStore } from '../../../../utils/api-response'
import { throwMeasurementTypeMutationError } from '../../../../utils/measurement-api-error'
import { validate, validateBody } from '../../../../utils/request-validation'

export default defineApiHandler(async (event) => {
  noStore(event)
  requireSameOrigin(event)
  const typeId = validate(getRouterParam(event, 'typeId'), z.string().uuid())
  const input = await validateBody(event, measurementTypeUpdateSchema)
  const { family, supabase } = await requireFamily(event)
  try {
    const updated = await new MeasurementTypeService(
      new SupabaseMeasurementTypeRepository(supabase),
    ).update(family.id, typeId, input)
    if (!updated)
      throw createError({
        statusCode: 404,
        statusMessage: 'Тип показателя не найден',
      })
    return { data: updated }
  } catch (error) {
    throwMeasurementTypeMutationError(error)
  }
})
