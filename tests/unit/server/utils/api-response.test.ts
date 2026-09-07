import { describe, expect, it } from 'vitest'
import { mapApiError } from '../../../../server/utils/api-response'

describe('mapApiError', () => {
  it('maps validation and unauthenticated failures to safe stable envelopes', () => {
    expect(
      mapApiError(
        {
          statusCode: 400,
          data: {
            code: 'VALIDATION_ERROR',
            fields: { name: 'Обязательное поле' },
          },
        },
        'req-1',
      ),
    ).toEqual({
      status: 400,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Проверьте заполненные поля',
          requestId: 'req-1',
          fields: { name: 'Обязательное поле' },
        },
      },
    })
    expect(mapApiError({ statusCode: 401 }, 'req-2')).toEqual({
      status: 401,
      body: {
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Требуется авторизация',
          requestId: 'req-2',
        },
      },
    })
    expect(mapApiError({ statusCode: 401, data: undefined }, 'req-3')).toEqual({
      status: 401,
      body: {
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Требуется авторизация',
          requestId: 'req-3',
        },
      },
    })
  })
})
