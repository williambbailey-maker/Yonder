import { useEffect, useRef } from 'react'
import { angleDelta } from '../lib/geo'

interface Props {
  /** True bearing to the destination, or null when there is nothing to point at yet. */
  bearing: number | null
  /** Live true heading of the phone, read every frame. Null when there is no compass. */
  getHeading: () => number | null
  onTarget: boolean
}

const TICKS = Array.from({ length: 72 }, (_, i) => i * 5)
const LETTERS: Array<[string, number]> = [
  ['N', 0],
  ['E', 90],
  ['S', 180],
  ['W', 270],
]

export function Dial({ bearing, getHeading, onTarget }: Props) {
  const ring = useRef<SVGGElement>(null)
  const arrow = useRef<SVGGElement>(null)
  const bearingRef = useRef(bearing)
  const headingFn = useRef(getHeading)
  bearingRef.current = bearing
  headingFn.current = getHeading

  // Rotation is driven straight from the sensor, outside React, so it stays smooth.
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let ringAngle = 0
    let arrowAngle = 0
    let first = true
    const step = () => {
      const h = headingFn.current()
      const b = bearingRef.current
      const ringTarget = h === null ? 0 : -h
      const arrowTarget = b === null ? 0 : b - (h ?? 0)
      const k = first || reduce ? 1 : 0.16
      first = false
      ringAngle += angleDelta(ringAngle, ringTarget) * k
      arrowAngle += angleDelta(arrowAngle, arrowTarget) * k
      ring.current?.setAttribute('transform', `rotate(${ringAngle.toFixed(2)})`)
      arrow.current?.setAttribute('transform', `rotate(${arrowAngle.toFixed(2)})`)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  const idle = bearing === null
  const fill = onTarget ? 'var(--accent)' : 'var(--ink)'

  return (
    <svg viewBox="-110 -110 220 220" className="h-full w-full" role="img" aria-label="Direction arrow">
      <g ref={ring}>
        {TICKS.map((d) => {
          const major = d % 90 === 0
          const mid = d % 30 === 0
          return (
            <line
              key={d}
              x1="0"
              x2="0"
              y1="-104"
              y2={major ? -92 : mid ? -96 : -100}
              transform={`rotate(${d})`}
              stroke={d === 0 ? 'var(--accent)' : 'var(--ink)'}
              strokeOpacity={d === 0 ? 1 : mid ? 0.55 : 0.25}
              strokeWidth={major ? 1.6 : 0.9}
              strokeLinecap="round"
            />
          )
        })}
        {LETTERS.map(([l, d]) => (
          <text
            key={l}
            transform={`rotate(${d}) translate(0 -80)`}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="var(--font-mono)"
            fontSize="8.5"
            fontWeight="500"
            fill={l === 'N' ? 'var(--accent)' : 'var(--muted)'}
          >
            {l}
          </text>
        ))}
      </g>
      <g ref={arrow}>
        <path
          className="arrow-shape"
          d="M0,-64 L45,-8 L15,-8 L15,62 L-15,62 L-15,-8 L-45,-8 Z"
          fill={fill}
          stroke={fill}
          strokeWidth="7"
          strokeLinejoin="round"
          opacity={idle ? 0.12 : 1}
        />
      </g>
    </svg>
  )
}
