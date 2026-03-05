'use client'

import { useEffect, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loadGoogleMapsApi } from '@/lib/google-maps/loader'

export type SelectedPlace = {
  address: string
  latitude: number
  longitude: number
  placeId: string
}

type PlaceAutocompleteInputProps = {
  label?: string
  required?: boolean
  initialAddress?: string
  onPlaceSelected: (place: SelectedPlace) => void
  onPlaceCleared: () => void
  disabled?: boolean
  enableMapSelection?: boolean
  value?: SelectedPlace | null
}

export function PlaceAutocompleteInput({
  label = 'Search location',
  required = false,
  initialAddress = '',
  onPlaceSelected,
  onPlaceCleared,
  disabled = false,
  enableMapSelection = false,
  value = null,
}: PlaceAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const mapRef = useRef<any | null>(null)
  const markerRef = useRef<any | null>(null)
  const geocoderRef = useRef<any | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const [query, setQuery] = useState(initialAddress)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    setQuery(initialAddress)
  }, [initialAddress])

  useEffect(() => {
    if (!value) return
    setQuery(value.address)
    if (mapRef.current && markerRef.current) {
      const center = { lat: value.latitude, lng: value.longitude }
      markerRef.current.setPosition(center)
      mapRef.current.setCenter(center)
      mapRef.current.setZoom(15)
    }
  }, [value])

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    let cancelled = false

    async function setupAutocomplete() {
      if (!inputRef.current) return
      if (!apiKey) {
        setStatusMessage('Google Maps key is missing. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.')
        return
      }

      try {
        const google = await loadGoogleMapsApi(apiKey)
        if (cancelled || !inputRef.current) return

        if (enableMapSelection && mapContainerRef.current) {
          try {
            geocoderRef.current = new google.maps.Geocoder()
            mapRef.current = new google.maps.Map(mapContainerRef.current, {
              center: { lat: 20, lng: 0 },
              zoom: 2,
              disableDefaultUI: true,
              zoomControl: true,
              gestureHandling: 'cooperative',
            })
            markerRef.current = new google.maps.Marker({
              map: mapRef.current,
              draggable: false,
            })

            mapRef.current.addListener('click', (event: any) => {
              const lat = event?.latLng?.lat?.()
              const lng = event?.latLng?.lng?.()
              if (typeof lat !== 'number' || typeof lng !== 'number') {
                return
              }

              markerRef.current?.setPosition({ lat, lng })
              mapRef.current?.setCenter({ lat, lng })
              mapRef.current?.setZoom(15)

              geocoderRef.current?.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
                if (status !== 'OK' || !results?.length) {
                  setStatusMessage('Could not resolve this map point. Try another point or search.')
                  onPlaceCleared()
                  return
                }
                const topResult = results[0]
                const address = topResult.formatted_address as string | undefined
                const placeId = topResult.place_id as string | undefined
                if (!address || !placeId) {
                  setStatusMessage('Could not resolve this map point. Try another point or search.')
                  onPlaceCleared()
                  return
                }
                setQuery(address)
                setStatusMessage(null)
                onPlaceSelected({
                  address,
                  latitude: lat,
                  longitude: lng,
                  placeId,
                })
              })
            })
          } catch {
            setStatusMessage('Map failed to initialize. Check Google Maps JavaScript API and key restrictions.')
          }
        }

        if (!google.maps?.places?.Autocomplete) {
          setIsReady(false)
          setStatusMessage('Places autocomplete is unavailable. Check Places API enablement and key restrictions.')
          return
        }

        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'geometry', 'name', 'place_id'],
          types: ['geocode'],
        })
        setIsReady(true)
        setStatusMessage(null)

        const listener = autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          const lat = place?.geometry?.location?.lat?.()
          const lng = place?.geometry?.location?.lng?.()
          const placeId = place?.place_id
          const address = place?.formatted_address || place?.name

          if (!address || typeof lat !== 'number' || typeof lng !== 'number' || !placeId) {
            setStatusMessage('Select a valid location from Google suggestions.')
            onPlaceCleared()
            return
          }

          setQuery(address)
          setStatusMessage(null)
          if (markerRef.current && mapRef.current) {
            const center = { lat, lng }
            markerRef.current.setPosition(center)
            mapRef.current.setCenter(center)
            mapRef.current.setZoom(15)
          }
          onPlaceSelected({
            address,
            latitude: lat,
            longitude: lng,
            placeId,
          })
        })

        if (enableMapSelection && mapContainerRef.current) {
          // Keep map marker in sync when a location is preselected on initial load.
          if (value) {
            const center = { lat: value.latitude, lng: value.longitude }
            markerRef.current?.setPosition(center)
            mapRef.current?.setCenter(center)
            mapRef.current?.setZoom(15)
          }
        }

        return () => listener?.remove?.()
      } catch {
        if (!cancelled) {
          setStatusMessage('Unable to load Google Places right now. Refresh and try again.')
        }
      }
    }

    setupAutocomplete()

    return () => {
      cancelled = true
    }
  }, [enableMapSelection, onPlaceCleared, onPlaceSelected, value])

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {label}
        {required ? <span className="text-red-500">*</span> : null}
      </Label>
      <Input
        ref={inputRef}
        value={query}
        onChange={(event) => {
          const next = event.target.value
          setQuery(next)
          onPlaceCleared()
          if (next.trim().length > 0 && isReady) {
            setStatusMessage('Select a location from Google suggestions.')
          } else {
            setStatusMessage(null)
          }
        }}
        placeholder="Search address or place"
        autoComplete="off"
        disabled={disabled}
        required={required}
      />
      {statusMessage ? <p className="text-xs text-muted-foreground">{statusMessage}</p> : null}
      {enableMapSelection ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            You can also click on the map to choose a location.
          </p>
          <div ref={mapContainerRef} className="h-56 w-full overflow-hidden rounded-lg border md:h-72" />
        </div>
      ) : null}
    </div>
  )
}

