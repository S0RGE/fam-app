import { getHealth } from '../../../application/health/get-health'

export default defineEventHandler(() => getHealth())
