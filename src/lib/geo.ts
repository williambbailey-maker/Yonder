import geomagnetism from 'geomagnetism'

export interface LatLon {
  lat: number
  lon: number
}

const RAD = Math.PI / 180
const EARTH_KM = 6371.0088

/** Wrap any angle into 0..360. */
export function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360
}

/** Signed shortest turn from `from` to `to`, in -180..180. */
export function angleDelta(from: number, to: number): number {
  return norm360(to - from + 180) - 180
}

/** Initial great-circle bearing from `a` to `b`, degrees clockwise from true north. */
export function bearing(a: LatLon, b: LatLon): number {
  const p1 = a.lat * RAD
  const p2 = b.lat * RAD
  const dl = (b.lon - a.lon) * RAD
  const y = Math.sin(dl) * Math.cos(p2)
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)
  return norm360(Math.atan2(y, x) / RAD)
}

/** Great-circle distance in kilometres. */
export function distanceKm(a: LatLon, b: LatLon): number {
  const p1 = a.lat * RAD
  const p2 = b.lat * RAD
  const dp = p2 - p1
  const dl = (b.lon - a.lon) * RAD
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']

export function cardinal(deg: number): string {
  return POINTS[Math.round(norm360(deg) / 22.5) % 16]
}

/**
 * Magnetic declination (degrees, east positive) at a point. Phone compasses
 * report magnetic north; add this to get true north. Off by 13° in
 * Connecticut and 22° in São Paulo, so it is worth correcting.
 */
export function declination(p: LatLon): number {
  try {
    const d = geomagnetism.model().point([p.lat, p.lon]).decl
    return Number.isFinite(d) ? d : 0
  } catch {
    return 0
  }
}

export type Units = 'km' | 'mi'

export function formatDistance(km: number, units: Units): string {
  const v = units === 'mi' ? km * 0.621371 : km
  if (v < 1) return `under 1 ${units}`
  const n = v < 100 ? Math.round(v * 10) / 10 : Math.round(v)
  return `${n.toLocaleString('en-US')} ${units}`
}

export function pad3(deg: number): string {
  return String(Math.round(norm360(deg)) % 360).padStart(3, '0')
}
