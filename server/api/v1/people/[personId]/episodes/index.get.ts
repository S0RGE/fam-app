import { defineApiHandler } from '../../../../../utils/api-handler'
import { z } from 'zod'
import { episodeQuerySchema } from '../../../../../../application/dto/episode'
import { validate } from '../../../../../utils/request-validation'
import { requireFamily } from '../../../../../utils/family-context'
import { SupabaseEpisodeRepository } from '../../../../../../infrastructure/supabase/episode-repository'
import { EpisodeService } from '../../../../../../application/episodes/episode-service'
import { noStore } from '../../../../../utils/api-response'
export default defineApiHandler(async (event) => {
  noStore(event)
  const id = validate(getRouterParam(event, 'personId'), z.string().uuid())
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
  const input = validate(Object.fromEntries(params), episodeQuerySchema)
  const { family, supabase } = await requireFamily(event)
  const result = await new EpisodeService(
    new SupabaseEpisodeRepository(supabase),
  ).list(family.id, id, input)
  return { data: result.episodes, meta: { ...input, total: result.total } }
})
