import { z } from 'zod'
import type {
  MeasurementType,
  MeasurementTypeStatus,
  MeasurementValueType,
} from '../../domain/measurement-type'

const valueTypeSchema = z.enum(['number', 'text', 'boolean', 'compound'], {
  error: 'Тип значения недоступен',
})
const statusSchema = z.enum(['active', 'archived'])
const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => value || null)
const optionalNullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => (value === undefined ? undefined : value || null))
const allowedUnitsSchema = z.array(z.string().trim().min(1).max(50)).max(20)

export const measurementTypeQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).max(1000000).default(0),
    name: z.string().trim().min(1).max(100).optional(),
  })
  .strict()

export const measurementTypeCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    category: z.string().trim().min(1).max(100),
    description: nullableText(5000),
    valueType: valueTypeSchema,
    unit: nullableText(50),
    allowedUnits: allowedUnitsSchema
      .optional()
      .transform((value) => value || []),
  })
  .strict()

export const measurementTypeUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    category: z.string().trim().min(1).max(100).optional(),
    description: optionalNullableText(5000),
    valueType: valueTypeSchema.optional(),
    unit: optionalNullableText(50),
    allowedUnits: allowedUnitsSchema.optional(),
    status: statusSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Укажите поля для обновления',
  })

export interface MeasurementTypeDto {
  id: string
  name: string
  category: string
  description: string | null
  valueType: MeasurementValueType
  unit: string | null
  allowedUnits: string[]
  status: MeasurementTypeStatus
  isPreset: boolean
  createdAt: string
  updatedAt: string
}

export const measurementTypeDto = (
  type: MeasurementType,
): MeasurementTypeDto => ({
  id: type.id,
  name: type.name,
  category: type.category,
  description: type.description,
  valueType: type.valueType,
  unit: type.unit,
  allowedUnits: type.allowedUnits,
  status: type.status,
  isPreset: type.isPreset,
  createdAt: type.createdAt,
  updatedAt: type.updatedAt,
})
