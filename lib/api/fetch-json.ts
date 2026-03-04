import { ApiError, toApiError } from '@/lib/errors/api-error'

export async function fetchJson<T>(input: RequestInfo | URL, init: RequestInit, fallbackMessage: string): Promise<T> {
  const response = await fetch(input, init)
  if (!response.ok) {
    throw await toApiError(response, fallbackMessage)
  }
  return (await response.json()) as T
}

export function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof ApiError) {
    if (error.details.length > 0) {
      const uniqueDetails = [...new Set(error.details)]
      const filteredDetails = uniqueDetails.filter((detail) => {
        const detailNorm = detail.trim().toLowerCase()
        const messageNorm = error.message.trim().toLowerCase()
        return detailNorm && detailNorm !== messageNorm
      })
      if (filteredDetails.length > 0) {
        return `${error.message}: ${filteredDetails.join(', ')}`
      }
    }
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return fallbackMessage
}
