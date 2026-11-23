import { useEffect, useRef, useState } from 'react'
import { searchPlaces, type Place } from '../lib/geocode'

interface Props {
  saved: Place[]
  recent: Place[]
  onPick: (p: Place) => void
  onToggleSaved: (p: Place) => void
  onClearRecent: () => void
  onClose: () => void
}

type State = 'idle' | 'loading' | 'done' | 'error'

export function Star({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"
        fill={on ? 'var(--accent)' : 'none'}
        stroke={on ? 'var(--accent)' : 'currentColor'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Row({ p, saved, onPick, onToggle }: { p: Place; saved: boolean; onPick: () => void; onToggle: () => void }) {
  return (
    <li className="flex items-stretch border-b border-line">
      <button type="button" onClick={onPick} className="min-w-0 flex-1 py-3.5 text-left active:opacity-60">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-display text-[1.35rem] leading-tight">{p.name}</span>
          <span className="shrink-0 font-mono text-[0.62rem] uppercase tracking-widest text-muted">{p.kind}</span>
        </div>
        {p.detail && <div className="truncate text-sm text-muted">{p.detail}</div>}
      </button>
      <button
        type="button"
        onClick={onToggle}
        aria-label={saved ? `Remove ${p.name} from saved` : `Save ${p.name}`}
        aria-pressed={saved}
        className="grid w-12 shrink-0 place-items-center text-muted active:opacity-60"
      >
        <Star on={saved} />
      </button>
    </li>
  )
}

export function SearchSheet({ saved, recent, onPick, onToggleSaved, onClearRecent, onClose }: Props) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [state, setState] = useState<State>('idle')
  const input = useRef<HTMLInputElement>(null)
  const ctrl = useRef<AbortController | null>(null)
  const savedIds = new Set(saved.map((p) => p.id))

  const run = (query: string, submitted: boolean) => {
    ctrl.current?.abort()
    if (query.trim().length < 2) {
      setResults([])
      setState('idle')
      return
    }
    const c = new AbortController()
    ctrl.current = c
    setState('loading')
    searchPlaces(query, { signal: c.signal, submitted })
      .then((r) => {
        if (c.signal.aborted) return
        setResults(r)
        setState('done')
      })
      .catch(() => {
        if (c.signal.aborted) return
        setState('error')
      })
  }

  // Search as they type, after a short pause.
  useEffect(() => {
    const t = window.setTimeout(() => run(q, false), 320)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  useEffect(() => {
    input.current?.focus()
    return () => ctrl.current?.abort()
  }, [])

  const typing = q.trim().length >= 2
  const recentOnly = recent.filter((p) => !savedIds.has(p.id))

  return (
    <div className="safe-top fixed inset-0 z-20 flex flex-col bg-paper px-5" role="dialog" aria-label="Choose a place">
      <form
        className="flex items-center gap-3 border-b-2 border-ink pb-3"
        onSubmit={(e) => {
          e.preventDefault()
          run(q, true)
          input.current?.blur()
        }}
      >
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="City or country"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="City or country"
          className="min-w-0 flex-1 bg-transparent font-display text-3xl outline-none placeholder:text-muted/60"
        />
        <button type="button" onClick={onClose} className="shrink-0 py-2 pl-2 text-sm font-medium text-muted active:opacity-60">
          Cancel
        </button>
      </form>

      <div className="safe-bottom min-h-0 flex-1 overflow-y-auto">
        {typing ? (
          <>
            {state === 'loading' && results.length === 0 && <p className="py-5 text-muted">Searching…</p>}
            {state === 'error' && (
              <p className="py-5 text-muted">
                Couldn’t reach the place search. Check your connection, then press search on the keyboard to try again.
              </p>
            )}
            {state === 'done' && results.length === 0 && (
              <p className="py-5 text-muted">Nothing found for “{q.trim()}”. Check the spelling or try a bigger place nearby.</p>
            )}
            <ul>
              {results.map((p) => (
                <Row key={p.id} p={p} saved={savedIds.has(p.id)} onPick={() => onPick(p)} onToggle={() => onToggleSaved(p)} />
              ))}
            </ul>
          </>
        ) : (
          <>
            {saved.length > 0 && (
              <section>
                <h2 className="pt-6 font-mono text-[0.68rem] uppercase tracking-widest text-muted">Saved</h2>
                <ul>
                  {saved.map((p) => (
                    <Row key={p.id} p={p} saved onPick={() => onPick(p)} onToggle={() => onToggleSaved(p)} />
                  ))}
                </ul>
              </section>
            )}
            {recentOnly.length > 0 && (
              <section>
                <div className="flex items-baseline justify-between pt-6">
                  <h2 className="font-mono text-[0.68rem] uppercase tracking-widest text-muted">Recent</h2>
                  <button type="button" onClick={onClearRecent} className="text-xs text-muted underline underline-offset-2">
                    Clear
                  </button>
                </div>
                <ul>
                  {recentOnly.map((p) => (
                    <Row key={p.id} p={p} saved={false} onPick={() => onPick(p)} onToggle={() => onToggleSaved(p)} />
                  ))}
                </ul>
              </section>
            )}
            {saved.length === 0 && recentOnly.length === 0 && (
              <p className="py-6 text-muted">Try Tokyo, Lisbon, or Brazil. Star a place to keep it here.</p>
            )}
          </>
        )}
        <p className="py-6 text-[0.7rem] leading-relaxed text-muted/80">
          Place search by Photon, using data ©{' '}
          <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            OpenStreetMap
          </a>{' '}
          contributors.
        </p>
      </div>
    </div>
  )
}
