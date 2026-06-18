'use client'
const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function Heatmap({ grid }: { grid: number[][] }) {
  const max = Math.max(1, ...grid.flat())
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '18px repeat(24, 1fr)', gap: 3, alignItems: 'center' }}>
      {grid.map((row, d) => (
        <>
          <span key={`l${d}`} style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 9, color: 'var(--adm-label)' }}>{DAYS[d]}</span>
          {row.map((v, h) => (
            <div key={`${d}-${h}`} title={`${DAYS[d]} ${h}:00 · ${v}`}
              style={{ aspectRatio: '1', borderRadius: 3, background: `rgba(99,102,241,${0.08 + 0.92 * (v / max)})` }} />
          ))}
        </>
      ))}
    </div>
  )
}
