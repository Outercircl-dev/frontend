const GOOGLE_MAPS_API_SRC = 'https://maps.googleapis.com/maps/api/js'
const SCRIPT_ID = 'outercircl-google-maps-script'

declare global {
  interface Window {
    google?: any
    __outercirclGoogleMapsPromise?: Promise<any>
  }
}

export function loadGoogleMapsApi(apiKey: string): Promise<any> {
  if (!apiKey) {
    return Promise.reject(new Error('Google Maps API key is missing'))
  }

  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps API can only load in the browser'))
  }

  if (window.google?.maps?.places) {
    return Promise.resolve(window.google)
  }

  if (window.__outercirclGoogleMapsPromise) {
    return window.__outercirclGoogleMapsPromise
  }

  window.__outercirclGoogleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps script')), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.async = true
    script.defer = true
    script.src = `${GOOGLE_MAPS_API_SRC}?key=${encodeURIComponent(apiKey)}&libraries=places`

    script.onload = () => {
      if (!window.google?.maps) {
        reject(new Error('Google Maps loaded without maps namespace'))
        return
      }
      resolve(window.google)
    }
    script.onerror = () => reject(new Error('Failed to load Google Maps script'))

    document.head.appendChild(script)
  })

  return window.__outercirclGoogleMapsPromise
}

