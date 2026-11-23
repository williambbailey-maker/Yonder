# Yonder — project context

A Dunwell PWA: enter a city or country, a big arrow points at it. One screen, no backend.

## Stack

React 19, Vite, TypeScript (strict), Tailwind v4 (`@tailwindcss/vite`, tokens in `src/index.css`),
`vite-plugin-pwa`. Tests with Vitest. Deployed on Vercel; a GitHub Pages workflow also exists
(`GITHUB_PAGES=1` switches the Vite base to `/yonder/`).

## Layout

- `src/App.tsx` — the screen: state, status hints, layout.
- `src/components/Dial.tsx` — compass ring and arrow. Rotation runs in a `requestAnimationFrame`
  loop that reads the sensor ref directly; do not move it into React state.
- `src/components/SearchSheet.tsx` — full-screen place search with saved and recent places.
- `src/hooks/useCompass.ts` — magnetic heading. iOS needs `requestPermission()` from a tap.
- `src/hooks/usePosition.ts` — geolocation watch.
- `src/lib/geo.ts` — bearing, distance, declination, formatting. Covered by `geo.test.ts`.
- `src/lib/geocode.ts` — Photon search, Nominatim fallback (submit only; its policy bans autocomplete).
- `src/lib/store.ts` — `localStorage` under `yonder:v1`.

## Rules of thumb

- Headings from the sensor are magnetic. Add `declination()` before comparing with a bearing.
- Design: Fraunces (display), Space Grotesk (UI), JetBrains Mono (numbers); warm paper and ink
  with one vermilion accent; light and dark via CSS variables. Restraint over decoration.
- The compass cannot be tested on a desktop. `npm test` covers the maths; sensor behaviour
  needs a real phone over HTTPS.
- Run `npm test && npm run build` before pushing.
