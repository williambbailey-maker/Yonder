import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dial } from './components/Dial'
import { SearchSheet, Star } from './components/SearchSheet'
import { useCompass } from './hooks/useCompass'
import { usePosition } from './hooks/usePosition'
import { angleDelta, bearing, cardinal, declination, distanceKm, formatDistance, norm360, pad3 } from './lib/geo'
import type { Place } from './lib/geocode'
import { load, save, type Stored } from './lib/store'

/** How close to dead-on counts as "facing it". Phone compasses are good to about this much. */
const ON_TARGET_DEG = 6

export default function App() {
  const [store, setStore] = useState<Stored>(load)
  const [searching, setSearching] = useState(false)
  const compass = useCompass()
  const position = usePosition(store.lastPos)

  useEffect(() => save(store), [store])

  const pos = position.pos
  useEffect(() => {
    if (pos) setStore((s) => (s.lastPos === pos ? s : { ...s, lastPos: pos }))
  }, [pos])

  const dest = store.dest
  const decl = useMemo(() => (pos ? declination(pos) : 0), [pos])
  const declRef = useRef(decl)
  declRef.current = decl

  const brg = pos && dest ? bearing(pos, dest) : null
  const km = pos && dest ? distanceKm(pos, dest) : null
  const hasCompass = compass.status === 'active' && compass.heading !== null
  const heading = hasCompass ? norm360(compass.heading! + decl) : null
  const off = brg !== null && heading !== null ? angleDelta(heading, brg) : null
  const onTarget = off !== null && Math.abs(off) <= ON_TARGET_DEG

  const { headingRef } = compass
  const getHeading = useCallback(
    () => (headingRef.current === null ? null : headingRef.current + declRef.current),
    [headingRef],
  )

  useEffect(() => {
    if (onTarget) navigator.vibrate?.(18)
  }, [onTarget])

  const begin = () => {
    void compass.start()
    position.start()
  }

  const pick = (p: Place) => {
    begin() // inside the tap, so iOS will show its motion prompt
    setStore((s) => ({ ...s, dest: p, recent: [p, ...s.recent.filter((r) => r.id !== p.id)].slice(0, 8) }))
    setSearching(false)
  }

  const toggleSaved = (p: Place) =>
    setStore((s) => ({
      ...s,
      saved: s.saved.some((x) => x.id === p.id) ? s.saved.filter((x) => x.id !== p.id) : [p, ...s.saved],
    }))

  const isSaved = !!dest && store.saved.some((p) => p.id === dest.id)
  const needsStart = !!dest && (compass.status === 'needs-tap' || (position.status === 'idle' && !pos))

  let hint: string | null = null
  if (dest && !needsStart) {
    if (position.status === 'denied') hint = 'Location is off. Allow location for this site so the arrow knows where you are.'
    else if (!pos) hint = position.status === 'error' ? 'Couldn’t get your location. Check that location services are on.' : 'Finding you…'
    else if (compass.status === 'denied') hint = 'Motion access was declined. Reload, then tap Allow when asked.'
    else if (compass.status === 'unavailable') hint = 'No compass on this device, so north is fixed at the top.'
    else if (compass.status === 'starting') hint = 'Waking the compass…'
    else if (compass.tilted) hint = 'Hold the phone flat, like a plate.'
    else if (compass.shaky) hint = 'Compass is unsure. Wave the phone in a figure eight.'
    else if (onTarget) hint = 'Dead ahead.'
    else if (off !== null) hint = `Turn ${off < 0 ? 'left' : 'right'} ${Math.abs(Math.round(off))}°`
  }

  return (
    <div className="safe-top safe-bottom mx-auto flex h-full max-w-md flex-col px-5">
      <header className="flex items-baseline justify-between">
        <h1 className="font-display text-xl italic">Yonder</h1>
        <div className="font-mono text-xs tabular-nums text-muted" aria-label="Your heading">
          {heading !== null ? `facing ${pad3(heading)}° ${cardinal(heading)}` : ' '}
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5">
        <div className="aspect-square w-full max-w-[min(100%,48dvh)]">
          <Dial bearing={brg} getHeading={getHeading} onTarget={onTarget} />
        </div>

        {dest ? (
          <div className="w-full text-center">
            <div className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-muted">Pointing to</div>
            <div className="mt-1 flex items-center justify-center gap-1">
              <h2 className="min-w-0 truncate font-display text-[2.6rem] leading-[1.05]">{dest.name}</h2>
              <button
                type="button"
                onClick={() => toggleSaved(dest)}
                aria-label={isSaved ? 'Remove from saved' : 'Save this place'}
                aria-pressed={isSaved}
                className="grid h-11 w-9 shrink-0 place-items-center text-muted active:opacity-60"
              >
                <Star on={isSaved} />
              </button>
            </div>
            {dest.detail && <div className="truncate text-sm text-muted">{dest.detail}</div>}
            <button
              type="button"
              onClick={() => setStore((s) => ({ ...s, units: s.units === 'km' ? 'mi' : 'km' }))}
              className="mt-3 font-mono text-base tabular-nums active:opacity-60"
              aria-label="Distance and bearing. Tap to switch between kilometres and miles."
            >
              {km !== null && brg !== null ? (
                <>
                  {formatDistance(km, store.units)}
                  <span className="text-muted"> · {pad3(brg)}° {cardinal(brg)}</span>
                </>
              ) : (
                <span className="text-muted">—</span>
              )}
            </button>
            <div className="mt-3 flex min-h-12 items-center justify-center">
              {needsStart ? (
                <button
                  type="button"
                  onClick={begin}
                  className="rounded-full bg-accent px-7 py-3 font-medium text-white active:opacity-80"
                >
                  Point the way
                </button>
              ) : (
                <p className={`text-sm ${onTarget ? 'font-medium text-accent' : 'text-muted'}`} aria-live="polite">
                  {hint}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full text-center">
            <h2 className="font-display text-[2.6rem] leading-[1.05]">Where to?</h2>
            <p className="mx-auto mt-2 max-w-[18rem] text-muted">Name a city or country. The arrow will point straight at it.</p>
          </div>
        )}
      </main>

      <button
        type="button"
        onClick={() => setSearching(true)}
        className="flex w-full items-center gap-3 rounded-full border border-line bg-card px-5 py-4 text-left active:opacity-70"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="shrink-0 text-muted">
          <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className={dest ? 'text-muted' : ''}>{dest ? 'Point somewhere else' : 'City or country'}</span>
      </button>

      {searching && (
        <SearchSheet
          saved={store.saved}
          recent={store.recent}
          onPick={pick}
          onToggleSaved={toggleSaved}
          onClearRecent={() => setStore((s) => ({ ...s, recent: [] }))}
          onClose={() => setSearching(false)}
        />
      )}
    </div>
  )
}
