# Yonder

Type a city or country. A big arrow points straight at it.

A single-screen PWA. It reads the phone's location and compass, works out the
great-circle bearing to the place you chose, and turns the arrow to match.

## Run it

```sh
npm install
npm run dev      # local dev server
npm test         # bearing, distance and declination checks
npm run build    # production build in dist/
```

The compass only works on a phone, over HTTPS. On a laptop the arrow shows the
bearing with north fixed at the top.

## How it works

- **Where you are**: the browser Geolocation API. City-level accuracy is enough.
- **Where it is**: place search by [Photon](https://photon.komoot.io) (OpenStreetMap
  data, no API key), with Nominatim as a fallback when you press search. A country
  resolves to OpenStreetMap's central point for it, not its capital.
- **Which way you face**: `webkitCompassHeading` on iOS Safari (after a one-time
  motion-access tap), `deviceorientationabsolute` on Android Chrome.
- **True north**: phone compasses report magnetic north. The World Magnetic Model
  (`geomagnetism`) corrects it, which matters: the gap is 13° in Connecticut and 22°
  in São Paulo.
- **Storage**: destination, saved and recent places, and units live in
  `localStorage`. There is no backend and no account.

## Deploying

- **Vercel**: import the repo. Vite is detected automatically; no settings needed.
- **GitHub Pages**: `.github/workflows/pages.yml` builds with `BASE_PATH` set to
  the repo name, so assets resolve under `/<repo>/`.
