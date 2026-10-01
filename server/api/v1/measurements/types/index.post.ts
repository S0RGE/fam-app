import { measurementTypeCreateSchema } from '../../../../../application/dto/measurement-type'
import { MeasurementTypeService } from '../../../../../application/measurements/measurement-type-service'
import { SupabaseMeasurementTypeRepository } from '../../../../../infrastructure/supabase/measurement-type-repository'
import { defineApiHandler } from '../../../../utils/api-handler'
import { requireSameOrigin } from '../../../../utils/csrf'
import { requireFamily } from '../../../../utils/family-context'
import { noStore } from '../../../../utils/api-response'
import { throwMeasurementTypeMutationError } from '../../../../utils/measurement-api-error'
import { validateBody } from '../../../../utils/request-validation'

export default defineApiHandler(async (event) => {
  noStore(event)
  requireSameOrigin(event)
  const input = await validateBody(event, measurementTypeCreateSchema)
  const { family, supabase } = await requireFamily(event)
  try {
    return {
      data: await new MeasurementTypeService(
        new SupabaseMeasurementTypeRepository(supabase),
      ).create(family.id, input),
    }
  } catch (error) {
    throwMeasurementTypeMutationError(error)
  }
})
