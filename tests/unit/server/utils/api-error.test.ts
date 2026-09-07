import { describe, expect, it } from 'vitest'
import { createApiError } from '../../../../server/utils/api-error'

describe('createApiError', () => {
  it('creates a stable safe error envelope', () => {
    expect(
      createApiError(
        'VALIDATION_ERROR',
        'Проверьте заполненные поля',
        'request-1',
        { title: 'Укажите заголовок' },
      ),
    ).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Проверьте заполненные поля',
        requestId: 'request-1',
        fields: { title: 'Укажите заголовок' },
      },
    })
  })

  it('omits fields when none are supplied', () => {
    expect(
      createApiError('INTERNAL_ERROR', 'Ошибка сервера', 'request-2'),
    ).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ошибка сервера',
        requestId: 'request-2',
      },
    })
  })
})
