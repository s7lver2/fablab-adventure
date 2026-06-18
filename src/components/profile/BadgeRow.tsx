'use client'

export interface Badge {
  icon: string
  title: string
  id?: string | number
}

export function BadgeRow({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) return null

  return (
    <div className="pf-badges">
      {badges.map((badge) => (
        <span
          key={badge.id ?? badge.icon}
          className="pf-badge"
          title={badge.title}
          role="img"
          aria-label={badge.title}
        >
          {badge.icon}
        </span>
      ))}
    </div>
  )
}
