import type { ZodType } from 'zod'
import { ZodError } from 'zod'

export async function validateBody<T>(
  event: Parameters<typeof readBody>[0],
  schema: ZodType<T>,
): Promise<T> {
  try {
    return schema.parse(await readBody(event))
  } catch (error) {
    throwValidation(error)
  }
}
export function validate<T>(value: unknown, schema: ZodType<T>): T {
  try {
    return schema.parse(value)
  } catch (error) {
    throwValidation(error)
  }
}
export function throwValidation(error: unknown): never {
  const fields: Record<string, string> = {}
  if (error instanceof ZodError)
    for (const issue of error.issues)
      fields[issue.path.join('.') || 'body'] = issue.message
  throw createError({
    statusCode: 400,
    statusMessage: 'Проверьте заполненные поля',
    data: { code: 'VALIDATION_ERROR', fields },
  })
}
