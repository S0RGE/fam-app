import { defineApiHandler } from '../../../utils/api-handler'
import { personSchema } from '../../../../application/dto/people'
import { validateBody } from '../../../utils/request-validation'
import { requireFamily } from '../../../utils/family-context'
import { SupabasePersonRepository } from '../../../../infrastructure/supabase/person-repository'
import { PeopleService } from '../../../../application/people/people-service'
import { requireSameOrigin } from '../../../utils/csrf'
import { noStore } from '../../../utils/api-response'
export default defineApiHandler(async (event) => {
  noStore(event)
  requireSameOrigin(event)
  const input = await validateBody(event, personSchema)
  const { family, supabase } = await requireFamily(event)
  return {
    data: await new PeopleService(
      new SupabasePersonRepository(supabase),
    ).create(family.id, input),
  }
})
