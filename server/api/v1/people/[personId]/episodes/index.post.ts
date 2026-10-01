import { defineApiHandler } from '../../../../../utils/api-handler'
import { z } from 'zod'
import { episodeCreateSchema } from '../../../../../../application/dto/episode'
import { validate, validateBody } from '../../../../../utils/request-validation'
import { requireFamily } from '../../../../../utils/family-context'
import { SupabasePersonRepository } from '../../../../../../infrastructure/supabase/person-repository'
import { SupabaseEpisodeRepository } from '../../../../../../infrastructure/supabase/episode-repository'
import { EpisodeService } from '../../../../../../application/episodes/episode-service'
import { requireSameOrigin } from '../../../../../utils/csrf'
import { noStore } from '../../../../../utils/api-response'
export default defineApiHandler(async (event) => {
  noStore(event)
  requireSameOrigin(event)
  const id = validate(getRouterParam(event, 'personId'), z.string().uuid())
  const input = await validateBody(event, episodeCreateSchema)
  const { family, supabase, id: authorId } = await requireFamily(event)
  if (!(await new SupabasePersonRepository(supabase).get(family.id, id)))
    throw createError({
      statusCode: 404,
      statusMessage: 'Член семьи не найден',
    })
  return {
    data: await new EpisodeService(
      new SupabaseEpisodeRepository(supabase),
    ).create(family.id, id, input, authorId),
  }
})
