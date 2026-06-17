import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { CurriculumRepository } from '@/lib/curriculum/repository'
import { ProgressRepository } from '@/lib/progress/repository'
import { getCurrentUser } from '@/lib/session/server'
import { AppBar } from '@/components/AppBar'
import { ProfileView } from './ProfileView'

export default async function ProfilePage() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!user) redirect('/login')

  const curriculum = new CurriculumRepository(db)
  const progress = new ProgressRepository(db)
  const challenges = curriculum.listChallenges()
  const completed = new Set(progress.completedChallengeIds(user.id))

  let totalStars = 0
  const achievements: { title: string; stars: number }[] = []
  for (const c of challenges) {
    const stars = progress.get(user.id, c.id)?.stars ?? 0
    totalStars += stars
    if (completed.has(c.id)) {
      achievements.push({ title: c.title, stars })
    }
  }

  return (
    <main className="page page--narrow">
      <AppBar avatar={user.avatar} displayName={user.displayName} />
      <ProfileView
        initialDisplayName={user.displayName}
        initialAvatar={user.avatar}
        initialProfileMessage={user.profileMessage}
        totalStars={totalStars}
        challengesDone={completed.size}
        achievements={achievements}
      />
    </main>
  )
}
