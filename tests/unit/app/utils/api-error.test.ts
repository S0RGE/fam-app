import { describe, expect, it } from 'vitest'
import { parseApiError } from '../../../../app/utils/api-error'

describe('parseApiError', () => {
  it('reads the stable API error envelope returned by defineApiHandler', () => {
    expect(
      parseApiError({
        statusCode: 400,
        data: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Проверьте заполненные поля',
            requestId: 'synthetic-request',
            fields: { email: 'Некорректный адрес email' },
          },
        },
      }),
    ).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      fields: { email: 'Некорректный адрес email' },
    })
  })

  it('reads raw createError data', () => {
    expect(
      parseApiError({
        statusCode: 409,
        data: {
          code: 'NOT_EDITABLE',
          fields: { eventId: 'Запись недоступна для редактирования' },
        },
      }),
    ).toEqual({
      statusCode: 409,
      code: 'NOT_EDITABLE',
      fields: { eventId: 'Запись недоступна для редактирования' },
    })
  })

  it('reads a serialized createError response body', () => {
    expect(
      parseApiError({
        data: {
          statusCode: 400,
          data: {
            code: 'VALIDATION_ERROR',
            fields: { title: 'Обязательное поле' },
          },
        },
      }),
    ).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      fields: { title: 'Обязательное поле' },
    })
  })

  it('ignores malformed and non-string field values', () => {
    expect(
      parseApiError({
        statusCode: 'bad',
        data: {
          error: {
            code: 42,
            fields: {
              title: 'Обязательное поле',
              secret: { value: 'не показывать' },
            },
          },
        },
      }),
    ).toEqual({
      statusCode: undefined,
      code: undefined,
      fields: { title: 'Обязательное поле' },
    })
    expect(parseApiError(null)).toEqual({
      statusCode: undefined,
      code: undefined,
      fields: {},
    })
  })
})
