export interface Place {
  id: string
  name: string
  /** Region and country, for telling Springfields apart. */
  detail: string
  /** city, country, state… */
  kind: string
  lat: number
  lon: number
}

const MAIN = new Set(['city', 'country', 'state'])
const WANTED = new Set(['county', 'locality', 'district', 'other'])

function dedupe(places: Place[]): Place[] {
  const seen = new Set<string>()
  return places.filter((p) => {
    const key = `${p.name}|${p.detail}`.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/* Photon (photon.komoot.io): free OpenStreetMap search that allows search-as-you-type. */
async function photon(q: string, signal: AbortSignal | undefined, layered: boolean): Promise<Place[]> {
  const params = new URLSearchParams({ q, limit: layered ? '6' : '15', lang: 'en' })
  if (layered) for (const l of ['city', 'country', 'state']) params.append('layer', l)
  const res = await fetch(`https://photon.komoot.io/api/?${params}`, { signal })
  if (!res.ok) throw new Error(`photon ${res.status}`)
  const data = await res.json()
  const out: Place[] = []
  for (const f of data?.features ?? []) {
    const p = f?.properties ?? {}
    const c = f?.geometry?.coordinates
    if (!Array.isArray(c) || typeof c[0] !== 'number' || typeof c[1] !== 'number' || !p.name) continue
    const kind: string = p.type ?? p.osm_value ?? 'place'
    // Without the server-side layer filter, drop streets, shops and the like ourselves.
    if (!layered && !(MAIN.has(kind) || (WANTED.has(kind) && p.osm_key === 'place'))) continue
    const detail = [p.state, p.country].filter((s: unknown) => s && s !== p.name).join(', ')
    out.push({
      id: `p:${p.osm_type ?? ''}${p.osm_id ?? `${c[1]},${c[0]}`}`,
      name: p.name,
      detail,
      kind,
      lat: c[1],
      lon: c[0],
    })
  }
  return dedupe(out).slice(0, 6)
}

/* Nominatim: the fallback. Its usage policy forbids autocomplete, so only call it on an explicit submit. */
async function nominatim(q: string, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    limit: '6',
    addressdetails: '1',
    'accept-language': 'en',
  })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal })
  if (!res.ok) throw new Error(`nominatim ${res.status}`)
  const data = await res.json()
  const out: Place[] = []
  for (const r of Array.isArray(data) ? data : []) {
    const lat = parseFloat(r.lat)
    const lon = parseFloat(r.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    const name: string = r.name || String(r.display_name ?? '').split(',')[0]
    if (!name) continue
    const a = r.address ?? {}
    const detail = [a.state, a.country].filter((s: unknown) => s && s !== name).join(', ')
    out.push({
      id: `n:${r.osm_type ?? ''}${r.osm_id ?? `${lat},${lon}`}`,
      name,
      detail,
      kind: r.addresstype ?? r.type ?? 'place',
      lat,
      lon,
    })
  }
  return dedupe(out)
}

/**
 * Look a place up. `submitted` means the person pressed search (rather than
 * us guessing as they type), which unlocks the Nominatim fallback.
 */
export async function searchPlaces(q: string, opts: { signal?: AbortSignal; submitted?: boolean } = {}): Promise<Place[]> {
  const query = q.trim()
  if (query.length < 2) return []
  const { signal, submitted } = opts
  try {
    return await photon(query, signal, true)
  } catch (e) {
    if (signal?.aborted) throw e
  }
  try {
    return await photon(query, signal, false)
  } catch (e) {
    if (signal?.aborted || !submitted) throw e
  }
  return nominatim(query, signal)
}
