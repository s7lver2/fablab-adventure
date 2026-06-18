import { notFound } from 'next/navigation'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { buildProfile } from '@/lib/users/profileStats'
import { ProfileLayout } from '@/components/profile/ProfileLayout'

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const db = getDb()
  const user = new UserRepository(db).findByUsername(username.trim().toLowerCase())
  if (!user || user.hidden) notFound()
  const profile = buildProfile(db, user)

  return (
    <main className="page" style={{ paddingTop: '1.5rem' }}>
      <ProfileLayout
        profile={profile}
        badges={profile.badges.map((b) => ({ ...b, title: b.label }))}
        totalStars={profile.totalStars}
        challengesDone={profile.challengesDone}
        mastery={Object.fromEntries(profile.mastery.map((m) => [m.concept, m.pct]))}
        recentLessons={profile.recentLessons.map((r) => ({ ...r, id: r.slug }))}
      />
    </main>
  )
}
