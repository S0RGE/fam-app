import { z } from 'zod'
import type {
  CompoundMeasurementValue,
  Measurement,
} from '../../domain/measurement'

const instant = z
  .string()
  .regex(/(?:z|[+-]\d{2}:\d{2})$/i, 'Укажите часовой пояс: Z или смещение')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Укажите дату и время')
  .transform((value) => new Date(value).toISOString())
const nullableText = (max: number, min = 0) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .nullable()
    .optional()
    .transform((value) => value || null)
const optionalNullableText = (max: number, min = 0) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .nullable()
    .optional()
    .transform((value) => (value === undefined ? undefined : value || null))
const compoundValueSchema = z
  .object({
    systolic: z.number().finite().min(1).max(1000),
    diastolic: z.number().finite().min(1).max(1000),
  })
  .strict()

export const measurementQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).max(1000000).default(0),
    from: instant.optional(),
    to: instant.optional(),
    typeId: z.string().uuid().optional(),
  })
  .strict()

export const measurementCreateSchema = z
  .object({
    measurementTypeId: z.string().uuid(),
    occurredAt: instant,
    numericValue: z.number().finite().nullable().optional(),
    textValue: nullableText(2000, 1),
    booleanValue: z.boolean().nullable().optional(),
    compoundValue: compoundValueSchema.nullable().optional(),
    unit: nullableText(50),
    comment: nullableText(1000),
    episodeId: z.string().uuid().nullable().optional(),
  })
  .strict()

export const measurementUpdateSchema = z
  .object({
    occurredAt: instant.optional(),
    numericValue: z.number().finite().nullable().optional(),
    textValue: optionalNullableText(2000, 1),
    booleanValue: z.boolean().nullable().optional(),
    compoundValue: compoundValueSchema.nullable().optional(),
    unit: optionalNullableText(50),
    comment: optionalNullableText(1000),
    episodeId: z.string().uuid().nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Укажите поля для обновления',
  })

export interface MeasurementDto {
  id: string
  measurementTypeId: string
  episodeId: string | null
  occurredAt: string
  numericValue: number | null
  textValue: string | null
  booleanValue: boolean | null
  compoundValue: CompoundMeasurementValue | null
  unit: string | null
  comment: string | null
  source: 'manual' | 'import'
  createdAt: string
  updatedAt: string
}

export const measurementDto = (measurement: Measurement): MeasurementDto => ({
  id: measurement.id,
  measurementTypeId: measurement.measurementTypeId,
  episodeId: measurement.episodeId,
  occurredAt: measurement.occurredAt,
  numericValue: measurement.numericValue,
  textValue: measurement.textValue,
  booleanValue: measurement.booleanValue,
  compoundValue: measurement.compoundValue,
  unit: measurement.unit,
  comment: measurement.comment,
  source: measurement.source,
  createdAt: measurement.createdAt,
  updatedAt: measurement.updatedAt,
})
