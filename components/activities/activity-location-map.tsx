'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { loadGoogleMapsApi } from '@/lib/google-maps/loader'

type ActivityLocationMapProps = {
  latitude: number | null | undefined
  longitude: number | null | undefined
  isApproximate: boolean
  className?: string
}

export function ActivityLocationMap({ latitude, longitude, isApproximate, className }: ActivityLocationMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const markerRef = useRef<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasCoordinates = useMemo(
    () => typeof latitude === 'number' && typeof longitude === 'number' && latitude !== 0 && longitude !== 0,
    [latitude, longitude],
  )

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    let cancelled = false

    async function setupMap() {
      if (!mapRef.current || !hasCoordinates) return

      if (!apiKey) {
        setError('Google Maps key is missing.')
        return
      }

      try {
        const google = await loadGoogleMapsApi(apiKey)
        if (cancelled || !mapRef.current || typeof latitude !== 'number' || typeof longitude !== 'number') return

        const center = { lat: latitude, lng: longitude }
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: isApproximate ? 11 : 15,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
          clickableIcons: false,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
        })

        markerRef.current = new google.maps.Marker({
          map,
          position: center,
          title: isApproximate ? 'Approximate activity area' : 'Activity meeting point',
        })
      } catch {
        if (!cancelled) {
          setError('Unable to load map right now.')
        }
      }
    }

    setupMap()
    return () => {
      cancelled = true
      if (markerRef.current) {
        markerRef.current.setMap(null)
      }
    }
  }, [hasCoordinates, isApproximate, latitude, longitude])

  if (!hasCoordinates) {
    return (
      <div className={`rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground ${className ?? ''}`}>
        Map unavailable for this activity location.
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      <div ref={mapRef} className="h-56 w-full overflow-hidden rounded-xl border md:h-72" />
      {isApproximate ? (
        <p className="text-xs text-muted-foreground">Approximate area shown. Join to reveal exact meeting point.</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

