'use client'
import { useState } from 'react'

export interface Badge {
  icon: string
  title: string
  id?: string | number
}

interface TooltipState {
  id: string | number
  x: number
  y: number
  label: string
}

export function BadgeRow({ badges }: { badges: Badge[] }) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  if (badges.length === 0) return null

  return (
    <div className="pf-badges">
      {badges.map((badge) => {
        const key = badge.id ?? badge.icon
        return (
          <span
            key={key}
            className="pf-badge"
            role="img"
            aria-label={badge.title}
            onMouseEnter={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
              setTooltip({ id: key, x: rect.left + rect.width / 2, y: rect.top, label: badge.title })
            }}
            onMouseLeave={() => setTooltip(null)}
          >
            {badge.icon}
          </span>
        )
      })}
      {tooltip && (
        <div
          className="badge-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.label}
        </div>
      )}
    </div>
  )
}
