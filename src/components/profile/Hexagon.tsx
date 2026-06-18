'use client'

export interface MasteryData {
  [conceptName: string]: number // 0-100 representing % completion
}

const SIZE = 240
const CENTER = SIZE / 2
const R_MAX = SIZE / 2 - 46 // leave room for labels around the edge

function angleFor(i: number, n: number): number {
  return (Math.PI * 2 * i) / n - Math.PI / 2
}

function pointAt(i: number, n: number, radius: number): [number, number] {
  const a = angleFor(i, n)
  return [CENTER + radius * Math.cos(a), CENTER + radius * Math.sin(a)]
}

function anchorFor(x: number): 'start' | 'middle' | 'end' {
  const dx = x - CENTER
  if (dx > 12) return 'start'
  if (dx < -12) return 'end'
  return 'middle'
}

export function Hexagon({ mastery }: { mastery: MasteryData }) {
  const labels = Object.keys(mastery)
  const values = Object.values(mastery).map((v) => Math.min(Math.max(v, 0), 100))
  const n = labels.length

  if (n === 0) return null

  const rings = [0.25, 0.5, 0.75, 1].map((t) =>
    labels.map((_, i) => pointAt(i, n, R_MAX * t).join(',')).join(' ')
  )

  const dataPoints = values.map((v, i) => pointAt(i, n, R_MAX * (v / 100)).join(',')).join(' ')

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="pf-hexagon-svg" role="img" aria-label="Dominio por concepto">
      {/* concentric grid */}
      {rings.map((pts, idx) => (
        <polygon
          key={idx}
          points={pts}
          fill={idx === rings.length - 1 ? 'rgba(167, 139, 250, 0.06)' : 'none'}
          stroke="rgba(167, 139, 250, 0.3)"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      ))}

      {/* spokes */}
      {labels.map((_, i) => {
        const [x, y] = pointAt(i, n, R_MAX)
        return <line key={i} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="rgba(167, 139, 250, 0.2)" strokeWidth={1} />
      })}

      {/* data polygon */}
      <polygon
        points={dataPoints}
        fill="rgba(167, 139, 250, 0.35)"
        stroke="rgb(124, 58, 237)"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />

      {/* data points */}
      {values.map((v, i) => {
        const [x, y] = pointAt(i, n, R_MAX * (v / 100))
        return <circle key={i} cx={x} cy={y} r={3.5} fill="rgb(124, 58, 237)" stroke="#fff" strokeWidth={1.5} />
      })}

      {/* labels */}
      {labels.map((label, i) => {
        const [x, y] = pointAt(i, n, R_MAX + 18)
        return (
          <text key={i} x={x} y={y} className="pf-hex-label" textAnchor={anchorFor(x)} dominantBaseline="middle">
            {label}
          </text>
        )
      })}
    </svg>
  )
}
