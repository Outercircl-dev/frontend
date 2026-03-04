type PresignResponse = {
  uploadUrl: string
  publicUrl: string
}

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_SIZE_BYTES = 5 * 1024 * 1024

export function validateActivityImage(file: File): string | null {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return 'Please choose a JPG, PNG, or WEBP image.'
  }
  if (file.size > MAX_SIZE_BYTES) {
    return 'Image must be 5MB or smaller.'
  }
  return null
}

export async function uploadActivityImage(file: File): Promise<string> {
  const validationError = validateActivityImage(file)
  if (validationError) {
    throw new Error(validationError)
  }

  const presignResponse = await fetch('/rpc/v1/uploads/activity-image/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
    }),
  })

  if (!presignResponse.ok) {
    const text = await presignResponse.text()
    throw new Error(text || 'Could not prepare image upload')
  }

  const { uploadUrl, publicUrl } = (await presignResponse.json()) as PresignResponse

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  })

  if (!uploadResponse.ok) {
    throw new Error('Image upload failed. Please try again.')
  }

  return publicUrl
}
