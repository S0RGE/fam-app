import { defineApiHandler } from '../../../../../utils/api-handler'
import { z } from 'zod'
import { episodeUpdateSchema } from '../../../../../../application/dto/episode'
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
  const personId = validate(
    getRouterParam(event, 'personId'),
    z.string().uuid(),
  )
  const episodeId = validate(
    getRouterParam(event, 'episodeId'),
    z.string().uuid(),
  )
  const input = await validateBody(event, episodeUpdateSchema)
  const { family, supabase } = await requireFamily(event)
  if (!(await new SupabasePersonRepository(supabase).get(family.id, personId)))
    throw createError({
      statusCode: 404,
      statusMessage: 'Член семьи не найден',
    })
  const episode = await new EpisodeService(
    new SupabaseEpisodeRepository(supabase),
  ).update(family.id, personId, episodeId, input)
  if (!episode)
    throw createError({ statusCode: 404, statusMessage: 'Эпизод не найден' })
  return { data: episode }
})
