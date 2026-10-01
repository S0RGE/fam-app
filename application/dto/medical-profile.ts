import { z } from 'zod'

const item = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z
      .string()
      .trim()
      .max(2000)
      .nullable()
      .optional()
      .transform((v) => v || null),
    status: z.enum(['active', 'archived']),
  })
  .strict()
export const medicalProfileSchema = z
  .object({
    bloodGroup: z.enum(['o', 'a', 'b', 'ab']).nullable(),
    rhesusFactor: z.enum(['positive', 'negative']).nullable(),
    generalComment: z.string().trim().max(5000).nullable(),
    allergies: z.array(item).max(100),
    chronicConditions: z.array(item).max(100),
    warnings: z.array(item).max(100),
  })
  .strict()
export interface MedicalProfileItemDto {
  id: string
  name: string
  description: string | null
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}
export interface MedicalProfileDto {
  id: string
  bloodGroup: 'o' | 'a' | 'b' | 'ab' | null
  rhesusFactor: 'positive' | 'negative' | null
  generalComment: string | null
  allergies: MedicalProfileItemDto[]
  chronicConditions: MedicalProfileItemDto[]
  warnings: MedicalProfileItemDto[]
  createdAt: string
  updatedAt: string
}
