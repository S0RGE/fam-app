import { measurementTypeQuerySchema } from '../../../../../application/dto/measurement-type'
import { MeasurementTypeService } from '../../../../../application/measurements/measurement-type-service'
import { SupabaseMeasurementTypeRepository } from '../../../../../infrastructure/supabase/measurement-type-repository'
import { defineApiHandler } from '../../../../utils/api-handler'
import { requireFamily } from '../../../../utils/family-context'
import { noStore } from '../../../../utils/api-response'
import { validate } from '../../../../utils/request-validation'

export default defineApiHandler(async (event) => {
  noStore(event)
  const params = new URLSearchParams(getRequestURL(event).search)
  const allowed = new Set(['limit', 'offset', 'name'])
  for (const key of params.keys())
    if (!allowed.has(key) || params.getAll(key).length !== 1)
      throw createError({
        statusCode: 400,
        data: {
          code: 'VALIDATION_ERROR',
          fields: { query: 'Недопустимые параметры' },
        },
      })
  const input = validate(Object.fromEntries(params), measurementTypeQuerySchema)
  const { family, supabase } = await requireFamily(event)
  const result = await new MeasurementTypeService(
    new SupabaseMeasurementTypeRepository(supabase),
  ).list(family.id, input)
  return { data: result.types, meta: { ...input, total: result.total } }
})
