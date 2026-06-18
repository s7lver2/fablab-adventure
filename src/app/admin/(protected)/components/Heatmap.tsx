'use client'
import React from 'react'
const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function Heatmap({ grid }: { grid: number[][] }) {
  const max = Math.max(1, ...grid.flat())
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '16px repeat(24, 1fr)', gap: 2, alignItems: 'center' }}>
      {grid.map((row, d) => (
        <React.Fragment key={d}>
          <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 9, color: 'var(--adm-label)' }}>{DAYS[d]}</span>
          {row.map((v, h) => (
            <div key={`${d}-${h}`} title={`${DAYS[d]} ${h}:00 · ${v}`}
              style={{ height: 17, borderRadius: 2, background: `rgba(99,102,241,${0.08 + 0.92 * (v / max)})` }} />
          ))}
        </React.Fragment>
      ))}
    </div>
  )
}
