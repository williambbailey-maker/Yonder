import type { Place } from './geocode'
import type { LatLon, Units } from './geo'

export interface Stored {
  dest: Place | null
  saved: Place[]
  recent: Place[]
  units: Units
  lastPos: LatLon | null
}

const KEY = 'yonder:v1'

function defaultUnits(): Units {
  const lang = typeof navigator !== 'undefined' ? navigator.language : ''
  return /-(US|GB|LR|MM)$/i.test(lang) ? 'mi' : 'km'
}

export function load(): Stored {
  const base: Stored = { dest: null, saved: [], recent: [], units: defaultUnits(), lastPos: null }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return base
    const s = JSON.parse(raw)
    return {
      dest: s.dest ?? null,
      saved: Array.isArray(s.saved) ? s.saved : [],
      recent: Array.isArray(s.recent) ? s.recent : [],
      units: s.units === 'mi' || s.units === 'km' ? s.units : base.units,
      lastPos: s.lastPos ?? null,
    }
  } catch {
    return base
  }
}

export function save(s: Stored): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* private mode or full storage: the app still works, it just forgets */
  }
}
