import { useCallback, useEffect, useRef, useState } from 'react'
import type { LatLon } from '../lib/geo'

export type PositionStatus = 'idle' | 'locating' | 'ok' | 'denied' | 'error'

/** Where the phone is. City-level accuracy is plenty for pointing at another city. */
export function usePosition(initial: LatLon | null) {
  const [pos, setPos] = useState<LatLon | null>(initial)
  const [status, setStatus] = useState<PositionStatus>('idle')
  const watching = useRef(false)

  const start = useCallback(() => {
    if (watching.current) return
    if (!('geolocation' in navigator)) {
      setStatus('error')
      return
    }
    watching.current = true
    setStatus('locating')
    navigator.geolocation.watchPosition(
      (p) => {
        setStatus('ok')
        setPos((prev) => {
          const next = { lat: p.coords.latitude, lon: p.coords.longitude }
          // Ignore jitter: the arrow would not visibly change.
          if (prev && Math.abs(prev.lat - next.lat) < 0.0005 && Math.abs(prev.lon - next.lon) < 0.0005) return prev
          return next
        })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          watching.current = false
          setStatus('denied')
        } else {
          setStatus((s) => (s === 'ok' ? s : 'error'))
        }
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 20_000 },
    )
  }, [])

  // If location was already allowed on an earlier visit, start without waiting for a tap.
  useEffect(() => {
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((r) => {
        if (r.state === 'granted') start()
      })
      .catch(() => {})
  }, [start])

  return { pos, status, start }
}
