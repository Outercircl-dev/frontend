type PresignResponse = {
  uploadUrl: string
  publicUrl: string
}

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export function validateProfileAvatar(file: File): string | null {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return 'Please choose a JPG, PNG, WEBP, or GIF image.'
  }
  return null
}

export async function uploadProfileAvatar(file: File): Promise<string> {
  const validationError = validateProfileAvatar(file)
  if (validationError) {
    throw new Error(validationError)
  }

  const presignResponse = await fetch('/rpc/v1/uploads/profile-avatar/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
    }),
  })

  if (!presignResponse.ok) {
    const contentType = presignResponse.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const body = (await presignResponse.json()) as { message?: string; error?: string }
      throw new Error(body.message || body.error || 'Could not prepare avatar upload')
    }
    const text = await presignResponse.text()
    throw new Error(text || 'Could not prepare avatar upload')
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
    throw new Error(`Avatar upload failed (${uploadResponse.status}). Please try again.`)
  }

  return publicUrl
}
