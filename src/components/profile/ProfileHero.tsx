'use client'

import { BadgeRow, Badge } from './BadgeRow'

export interface ProfileHeroProps {
  profile: {
    avatar: string
    displayName: string
    username: string
  }
  badges?: Badge[]
  action?: React.ReactNode
}

export function ProfileHero({
  profile,
  badges = [],
  action,
}: ProfileHeroProps) {
  return (
    <div className="pf-card">
      <div className="pf-banner" />
      <div className="pf-body">
        <div className="pf-avatar">{profile.avatar || '🦊'}</div>
        <h1 className="pf-name">{profile.displayName}</h1>
        <div className="pf-handle-row">
          <span className="pf-handle">@{profile.username}</span>
          <BadgeRow badges={badges} />
        </div>
        {action && <div className="pf-action">{action}</div>}
      </div>
    </div>
  )
}
