'use client'

import { BadgeRow, Badge } from './BadgeRow'
import { bannerCss } from '@/lib/users/banners'

export interface ProfileHeroProps {
  profile: {
    avatar: string
    avatarImage?: string | null
    displayName: string
    username: string
    banner?: string
    bannerImage?: string | null
  }
  badges?: Badge[]
  action?: React.ReactNode
}

export function ProfileHero({
  profile,
  badges = [],
  action,
}: ProfileHeroProps) {
  const avatarContent = profile.avatarImage
    ? <img src={profile.avatarImage} alt={profile.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
    : profile.avatar || '🦊'

  return (
    <div className="pf-card pf-hero">
      <div className="pf-banner" style={{ background: bannerCss(profile.banner || 'preset:sunset', profile.bannerImage || null) }} />
      <div className="pf-hero-row">
        <div className="pf-avatar">{avatarContent}</div>
        <div className="pf-hero-info">
          <div className="pf-name-row">
            <h1 className="pf-name">{profile.displayName}</h1>
            <BadgeRow badges={badges} />
          </div>
          <span className="pf-handle">@{profile.username}</span>
        </div>
        {action && <div className="pf-action">{action}</div>}
      </div>
    </div>
  )
}
