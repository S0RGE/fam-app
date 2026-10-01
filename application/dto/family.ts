import { z } from 'zod'

export const createFamilySchema = z
  .object({ name: z.string().trim().min(1).max(120) })
  .strict()
export interface FamilyDto {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}
