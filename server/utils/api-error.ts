export interface ApiErrorFields {
  [path: string]: string
}

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
    requestId: string
    fields?: ApiErrorFields
  }
}

export function createApiError(
  code: string,
  message: string,
  requestId: string,
  fields?: ApiErrorFields,
): ApiErrorResponse {
  return {
    error: {
      code,
      message,
      requestId,
      ...(fields ? { fields } : {}),
    },
  }
}
