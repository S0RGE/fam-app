export interface ApiSuccess<T> {
  data: T
}
export interface ApiListSuccess<T> {
  data: T[]
  meta: { limit: number; offset: number; total: number }
}
