import { z } from 'zod'

const instant = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Укажите дату и время')
  .transform((value) => new Date(value).toISOString())

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => v || null)

const symptom = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: nullableText(2000),
  })
  .strict()

const shape = {
  title: z.string().trim().min(1).max(120),
  description: nullableText(5000),
  startedAt: instant,
  endedAt: instant
    .nullable()
    .optional()
    .transform((v) => v || null),
  outcome: nullableText(2000),
  symptoms: z
    .array(symptom)
    .max(100)
    .optional()
    .transform((v) => v || []),
  tags: z
    .array(z.string().trim().min(1).max(100))
    .max(50)
    .optional()
    .transform((v) => v || []),
}
const episodeObject = z.object(shape).strict()
export const episodeCreateSchema = episodeObject.superRefine((value, ctx) => {
  if (value.endedAt && Date.parse(value.endedAt) < Date.parse(value.startedAt))
    ctx.addIssue({
      code: 'custom',
      path: ['endedAt'],
      message: 'Дата завершения не ранее даты начала',
    })
})
export const episodeUpdateSchema = episodeObject
  .partial()
  .superRefine((value, ctx) => {
    if (
      value.endedAt &&
      value.startedAt &&
      Date.parse(value.endedAt) < Date.parse(value.startedAt)
    )
      ctx.addIssue({
        code: 'custom',
        path: ['endedAt'],
        message: 'Дата завершения не ранее даты начала',
      })
  })

export interface EpisodeSymptomDto {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface EpisodeTagDto {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface EpisodeDto {
  id: string
  title: string
  description: string | null
  status: 'active' | 'completed'
  startedAt: string
  endedAt: string | null
  outcome: string | null
  symptoms: EpisodeSymptomDto[]
  tags: EpisodeTagDto[]
  createdAt: string
  updatedAt: string
}

export interface EpisodeQueryDto {
  limit: number
  offset: number
  status?: 'active' | 'completed'
}

export const episodeQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).max(1000000).default(0),
    status: z.enum(['active', 'completed']).optional(),
  })
  .strict()
