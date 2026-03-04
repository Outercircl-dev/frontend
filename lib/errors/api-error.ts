export type ApiErrorPayload = {
  statusCode?: number
  message?: string | string[]
  details?: Array<{ field?: string; message?: string }>
  error?: string
}

export class ApiError extends Error {
  statusCode: number
  details: string[]

  constructor(message: string, statusCode: number, details: string[] = []) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.details = details
  }
}

export async function toApiError(response: Response, fallbackMessage: string): Promise<ApiError> {
  const contentType = response.headers.get('content-type') ?? ''
  let payload: ApiErrorPayload | null = null
  let text = ''

  if (contentType.includes('application/json')) {
    payload = (await response.json().catch(() => null)) as ApiErrorPayload | null
  } else {
    text = await response.text().catch(() => '')
  }

  const rawMessage =
    (Array.isArray(payload?.message) ? payload?.message.join(', ') : payload?.message) ||
    payload?.error ||
    text ||
    fallbackMessage

  const details = Array.isArray(payload?.details)
    ? payload!.details.map((detail) => detail.message || detail.field || '').filter(Boolean)
    : []

  return new ApiError(rawMessage, response.status || 500, details)
}
