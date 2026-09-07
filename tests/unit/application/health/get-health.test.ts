import { describe, expect, it } from 'vitest'
import { getHealth } from '../../../../application/health/get-health'

describe('getHealth', () => {
  it('returns the public health DTO', () => {
    expect(getHealth()).toEqual({ data: { status: 'ok' } })
  })
})
