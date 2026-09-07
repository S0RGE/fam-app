import type { HealthResponseDto } from '../dto/health'

export function getHealth(): HealthResponseDto {
  return { data: { status: 'ok' } }
}
