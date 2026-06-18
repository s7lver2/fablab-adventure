'use client'

import { ProfileHero, ProfileHeroProps } from './ProfileHero'
import { Hexagon, MasteryData } from './Hexagon'
import { RecentLessons, RecentLesson } from './RecentLessons'

export interface ProfileLayoutProps extends Omit<ProfileHeroProps, 'profile'> {
  profile: ProfileHeroProps['profile'] & {
    about?: string
  }
  totalStars?: number
  challengesDone?: number
  mastery?: MasteryData
  recentLessons?: RecentLesson[]
  action?: React.ReactNode
}

export function ProfileLayout({
  profile,
  badges = [],
  totalStars = 0,
  challengesDone = 0,
  mastery = {},
  recentLessons = [],
  action,
}: ProfileLayoutProps) {
  const hasMastery = Object.keys(mastery).length > 0
  const hasLessons = recentLessons.length > 0

  return (
    <div className="pf-wrap">
      <ProfileHero profile={profile} badges={badges} action={action} />

      {profile.about && (
        <div className="pf-card pf-section">
          <p className="pf-about">{profile.about}</p>
        </div>
      )}

      <div className="pf-stats">
        <div className="pf-panel">
          <div className="pf-panel-value">{totalStars}</div>
          <div className="pf-panel-label">Estrellas</div>
        </div>
        <div className="pf-panel">
          <div className="pf-panel-value">{challengesDone}</div>
          <div className="pf-panel-label">Retos hechos</div>
        </div>
      </div>

      {(hasMastery || hasLessons) && (
        <div className="pf-grid2">
          {hasMastery && (
            <div className="pf-card">
              <h2 className="pf-section-title">Dominio</h2>
              <Hexagon mastery={mastery} />
            </div>
          )}
          {hasLessons && <RecentLessons lessons={recentLessons} />}
        </div>
      )}
    </div>
  )
}
