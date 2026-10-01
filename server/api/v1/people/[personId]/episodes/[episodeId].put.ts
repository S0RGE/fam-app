import { defineApiHandler } from '../../../../../utils/api-handler'
import { z } from 'zod'
import { validate, validateBody } from '../../../../../utils/request-validation'
import { requireFamily } from '../../../../../utils/family-context'
import { SupabasePersonRepository } from '../../../../../../infrastructure/supabase/person-repository'
import { SupabaseEpisodeRepository } from '../../../../../../infrastructure/supabase/episode-repository'
import { EpisodeService } from '../../../../../../application/episodes/episode-service'
import { requireSameOrigin } from '../../../../../utils/csrf'
import { noStore } from '../../../../../utils/api-response'
const transitionSchema = z
  .object({ status: z.enum(['active', 'completed']) })
  .strict()
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
  const { status } = await validateBody(event, transitionSchema)
  const { family, supabase, id: authorId } = await requireFamily(event)
  if (!(await new SupabasePersonRepository(supabase).get(family.id, personId)))
    throw createError({
      statusCode: 404,
      statusMessage: 'Член семьи не найден',
    })
  const episode = await new EpisodeService(
    new SupabaseEpisodeRepository(supabase),
  ).transition(family.id, personId, episodeId, status, authorId)
  if (!episode)
    throw createError({ statusCode: 404, statusMessage: 'Эпизод не найден' })
  return { data: episode }
})
