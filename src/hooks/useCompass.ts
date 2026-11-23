import { useCallback, useEffect, useRef, useState } from 'react'
import { angleDelta, norm360 } from '../lib/geo'

export type CompassStatus =
  | 'needs-tap' // iOS: motion access must be requested from a tap
  | 'starting'
  | 'active'
  | 'denied'
  | 'unavailable' // no compass (laptops, some tablets)

type IOSOrientationEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number
  webkitCompassAccuracy?: number
}

type PermissionedCtor = { requestPermission?: () => Promise<'granted' | 'denied'> }

function needsPermission(): boolean {
  return (
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof (DeviceOrientationEvent as unknown as PermissionedCtor).requestPermission === 'function'
  )
}

function screenAngle(): number {
  const a = screen.orientation?.angle
  if (typeof a === 'number') return a
  const legacy = (window as unknown as { orientation?: number }).orientation
  return typeof legacy === 'number' ? legacy : 0
}

/**
 * Magnetic compass heading of the top of the screen, in degrees.
 * `headingRef` updates on every sensor event (for animation); `heading`
 * is a throttled copy for text.
 */
export function useCompass() {
  const headingRef = useRef<number | null>(null)
  const [heading, setHeading] = useState<number | null>(null)
  const [tilted, setTilted] = useState(false)
  const [shaky, setShaky] = useState(false)
  const [status, setStatus] = useState<CompassStatus>(() =>
    typeof DeviceOrientationEvent === 'undefined' ? 'unavailable' : needsPermission() ? 'needs-tap' : 'starting',
  )
  const lastPush = useRef(0)
  const got = useRef(false)

  // One stable handler, so adding it twice is harmless.
  const onEvent = useCallback((ev: Event) => {
    const e = ev as IOSOrientationEvent
    let h: number | null = null
    if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
      h = e.webkitCompassHeading
    } else if (e.absolute && typeof e.alpha === 'number') {
      h = 360 - e.alpha
    }
    if (h === null) return
    const value = norm360(h + screenAngle())
    headingRef.current = value
    if (!got.current) {
      got.current = true
      setStatus('active')
    }
    const now = performance.now()
    if (now - lastPush.current > 120) {
      lastPush.current = now
      setHeading((prev) => (prev === null || Math.abs(angleDelta(prev, value)) >= 1 ? value : prev))
      setTilted(typeof e.beta === 'number' && Math.abs(e.beta) > 62)
      const acc = e.webkitCompassAccuracy
      setShaky(typeof acc === 'number' && (acc < 0 || acc > 30))
    }
  }, [])

  const attach = useCallback(() => {
    // Android Chrome reports true compass data on the "absolute" event;
    // iOS Safari reports it on the plain one via webkitCompassHeading.
    window.addEventListener('deviceorientationabsolute', onEvent)
    window.addEventListener('deviceorientation', onEvent)
  }, [onEvent])

  /** If nothing has arrived after a few seconds, settle on `fallback`. */
  const giveUpAfter = useCallback((fallback: CompassStatus) => {
    window.setTimeout(() => {
      if (!got.current) setStatus(fallback)
    }, 3500)
  }, [])

  /** Call from a tap. Asks for motion access where the browser requires it. */
  const start = useCallback(async () => {
    if (got.current) return
    if (typeof DeviceOrientationEvent === 'undefined') {
      setStatus('unavailable')
      return
    }
    const ctor = DeviceOrientationEvent as unknown as PermissionedCtor
    if (typeof ctor.requestPermission !== 'function') return
    try {
      const res = await ctor.requestPermission()
      attach()
      if (got.current) return
      if (res === 'granted') {
        setStatus('starting')
        giveUpAfter('unavailable')
      } else {
        // Some browsers answer "denied" yet still deliver readings; wait and see.
        giveUpAfter('denied')
      }
    } catch {
      if (!got.current) setStatus('needs-tap')
    }
  }, [attach, giveUpAfter])

  // Listen from the start: browsers that need no permission begin reporting straight away.
  useEffect(() => {
    if (typeof DeviceOrientationEvent === 'undefined') return
    attach()
    if (!needsPermission()) giveUpAfter('unavailable')
    return () => {
      window.removeEventListener('deviceorientationabsolute', onEvent)
      window.removeEventListener('deviceorientation', onEvent)
    }
  }, [attach, giveUpAfter, onEvent])

  return { headingRef, heading, status, tilted, shaky, start }
}
