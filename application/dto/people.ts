import { z } from 'zod'

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`)
    return (
      !Number.isNaN(date.valueOf()) &&
      date.toISOString().startsWith(value) &&
      value <= new Date().toISOString().slice(0, 10)
    )
  }, 'Дата рождения не может быть в будущем')
const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => v || null)
export const personSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    middleName: nullableText(100),
    birthDate: dateOnly,
    sex: z.enum(['male', 'female', 'unspecified']),
    familyRole: nullableText(50),
  })
  .strict()
export const peopleQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).max(1000000).default(0),
    status: z.enum(['active', 'archived']).optional(),
  })
  .strict()
export interface PersonDto {
  id: string
  firstName: string
  lastName: string
  middleName: string | null
  birthDate: string
  sex: 'male' | 'female' | 'unspecified'
  familyRole: string | null
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}
