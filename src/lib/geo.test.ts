import { describe, expect, it } from 'vitest'
import { angleDelta, bearing, cardinal, declination, distanceKm, formatDistance, norm360, pad3 } from './geo'

const NYC = { lat: 40.7128, lon: -74.006 }
const LONDON = { lat: 51.5074, lon: -0.1278 }
const TOKYO = { lat: 35.6762, lon: 139.6503 }
const SAO_PAULO = { lat: -23.5505, lon: -46.6333 }
const FAIRFIELD = { lat: 41.14, lon: -73.26 }

describe('bearing', () => {
  it('matches known great-circle headings', () => {
    expect(bearing(NYC, LONDON)).toBeCloseTo(51.2, 0)
    // Tokyo is north-north-west of New York over the pole, not west.
    expect(bearing(NYC, TOKYO)).toBeGreaterThan(330)
    expect(bearing(NYC, TOKYO)).toBeLessThan(336)
    expect(bearing({ lat: 0, lon: 0 }, { lat: 10, lon: 0 })).toBeCloseTo(0, 5)
    expect(bearing({ lat: 0, lon: 0 }, { lat: 0, lon: 10 })).toBeCloseTo(90, 5)
    expect(bearing({ lat: 0, lon: 0 }, { lat: -10, lon: 0 })).toBeCloseTo(180, 5)
    expect(bearing({ lat: 0, lon: 0 }, { lat: 0, lon: -10 })).toBeCloseTo(270, 5)
  })
})

describe('distance', () => {
  it('matches known distances', () => {
    expect(distanceKm(NYC, LONDON)).toBeGreaterThan(5540)
    expect(distanceKm(NYC, LONDON)).toBeLessThan(5600)
    expect(distanceKm(NYC, TOKYO)).toBeGreaterThan(10800)
    expect(distanceKm(NYC, TOKYO)).toBeLessThan(10900)
    expect(distanceKm(NYC, NYC)).toBe(0)
  })
})

describe('angles', () => {
  it('wraps and takes the short way round', () => {
    expect(norm360(-10)).toBe(350)
    expect(norm360(725)).toBe(5)
    expect(angleDelta(350, 10)).toBe(20)
    expect(angleDelta(10, 350)).toBe(-20)
    expect(angleDelta(0, 180)).toBe(-180)
    expect(angleDelta(-3600 + 90, 100)).toBe(10)
  })
  it('names compass points', () => {
    expect(cardinal(0)).toBe('N')
    expect(cardinal(359)).toBe('N')
    expect(cardinal(45)).toBe('NE')
    expect(cardinal(333)).toBe('NNW')
    expect(pad3(359.7)).toBe('000')
    expect(pad3(7)).toBe('007')
  })
})

describe('declination', () => {
  it('is west (negative) in Connecticut and São Paulo', () => {
    expect(declination(FAIRFIELD)).toBeGreaterThan(-15)
    expect(declination(FAIRFIELD)).toBeLessThan(-11)
    expect(declination(SAO_PAULO)).toBeGreaterThan(-24)
    expect(declination(SAO_PAULO)).toBeLessThan(-20)
  })
})

describe('formatDistance', () => {
  it('formats both units', () => {
    expect(formatDistance(10848.2, 'km')).toBe('10,848 km')
    expect(formatDistance(10848.2, 'mi')).toBe('6,741 mi')
    expect(formatDistance(42.34, 'km')).toBe('42.3 km')
    expect(formatDistance(0.4, 'km')).toBe('under 1 km')
  })
})
