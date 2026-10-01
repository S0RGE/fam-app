import { z } from 'zod'
import type {
  MedicalEvent,
  MedicalEventSource,
  MedicalEventType,
} from '../../domain/medical-event'

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

/** All eight event types of the timeline (spec §8). */
export const medicalEventTypeEnum = z.enum([
  'note',
  'measurement',
  'lab_report',
  'visit',
  'prescription',
  'document',
  'episode_start',
  'episode_end',
])

export const medicalEventQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).max(1000000).default(0),
    from: instant.optional(),
    to: instant.optional(),
    type: medicalEventTypeEnum.optional(),
    episodeId: z.string().uuid().optional(),
  })
  .strict()

export const medicalEventCreateSchema = z
  .object({
    occurredAt: instant,
    title: z.string().trim().min(1).max(120),
    description: nullableText(5000),
    episodeId: z
      .string()
      .uuid()
      .nullable()
      .optional()
      .transform((v) => v || null),
  })
  .strict()

export const medicalEventUpdateSchema = z
  .object({
    occurredAt: instant.optional(),
    title: z.string().trim().min(1).max(120).optional(),
    description: z
      .string()
      .trim()
      .max(5000)
      .superRefine((v, ctx) => {
        if (v.length === 0)
          ctx.addIssue({ code: 'custom', message: 'Укажите текст описания' })
      })
      .nullable()
      .optional(),
    episodeId: z.string().uuid().nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Укажите поля для обновления',
  })

export interface MedicalEventDto {
  id: string
  episodeId: string | null
  type: MedicalEventType
  occurredAt: string
  title: string
  description: string | null
  source: MedicalEventSource
  authorId: string
  createdAt: string
  updatedAt: string
}

export interface MedicalEventQueryDto {
  limit: number
  offset: number
  from?: string
  to?: string
  type?: MedicalEventType
  episodeId?: string
}

export const medicalEventDto = (e: MedicalEvent): MedicalEventDto => ({
  id: e.id,
  episodeId: e.episodeId,
  type: e.type,
  occurredAt: e.occurredAt,
  title: e.title,
  description: e.description,
  source: e.source,
  authorId: e.authorId,
  createdAt: e.createdAt,
  updatedAt: e.updatedAt,
})
