import { defineApiHandler } from '../../../utils/api-handler'
import { peopleQuerySchema } from '../../../../application/dto/people'
import { validate } from '../../../utils/request-validation'
import { requireFamily } from '../../../utils/family-context'
import { SupabasePersonRepository } from '../../../../infrastructure/supabase/person-repository'
import { PeopleService } from '../../../../application/people/people-service'
import { noStore } from '../../../utils/api-response'
export default defineApiHandler(async (event) => {
  noStore(event)
  const params = new URLSearchParams(getRequestURL(event).search)
  const allowed = new Set(['limit', 'offset', 'status'])
  for (const key of params.keys())
    if (!allowed.has(key) || params.getAll(key).length !== 1)
      throw createError({
        statusCode: 400,
        data: {
          code: 'VALIDATION_ERROR',
          fields: { query: 'Недопустимые параметры' },
        },
      })
  const input = validate(Object.fromEntries(params), peopleQuerySchema)
  const { family, supabase } = await requireFamily(event)
  const result = await new PeopleService(
    new SupabasePersonRepository(supabase),
  ).list(family.id, input)
  return { data: result.people, meta: { ...input, total: result.total } }
})
