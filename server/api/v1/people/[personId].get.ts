import { defineApiHandler } from '../../../utils/api-handler'
import { z } from 'zod'
import { validate } from '../../../utils/request-validation'
import { requireFamily } from '../../../utils/family-context'
import { SupabasePersonRepository } from '../../../../infrastructure/supabase/person-repository'
import { PeopleService } from '../../../../application/people/people-service'
import { noStore } from '../../../utils/api-response'
export default defineApiHandler(async (event) => {
  noStore(event)
  const id = validate(getRouterParam(event, 'personId'), z.string().uuid())
  const { family, supabase } = await requireFamily(event)
  const person = await new PeopleService(
    new SupabasePersonRepository(supabase),
  ).get(family.id, id)
  if (!person) throw createError({ statusCode: 404 })
  return { data: person }
})
