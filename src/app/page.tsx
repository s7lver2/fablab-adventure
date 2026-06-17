import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { CurriculumRepository } from '@/lib/curriculum/repository'
import { ProgressRepository } from '@/lib/progress/repository'
import { getCurrentUser } from '@/lib/session/server'
import { nextChallengeSlug } from '@/lib/progress/next'
import { AppBar } from '@/components/AppBar'
import { ChallengeRow } from '@/components/ChallengeRow'

export default async function HomePage() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!user) redirect('/login')

  const curriculum = new CurriculumRepository(db)
  const progress = new ProgressRepository(db)
  const challenges = curriculum.listChallenges()
  const completed = new Set(progress.completedChallengeIds(user.id))
  const next = nextChallengeSlug(challenges, [...completed])

  // Estrellas por reto (derivado de progress, dato existente)
  const starsById = new Map<number, number>()
  for (const c of challenges) {
    starsById.set(c.id, progress.get(user.id, c.id)?.stars ?? 0)
  }
  const totalStars = [...starsById.values()].reduce((a, b) => a + b, 0)
  const challengesDone = completed.size

  return (
    <main className="page">
      <AppBar avatar={user.avatar} displayName={user.displayName} />

      <div className="greeting">
        <h1>¡Hola, {user.displayName}! 👋</h1>
        <span className="chip">⭐ {totalStars} · 🏆 {challengesDone}</span>
      </div>

      {next && (
        <div className="mission">
          <div>
            <h2>Siguiente misión</h2>
            <p>¡Tu próxima aventura te espera!</p>
          </div>
          <Link href={`/challenge/${next}`} className="btn">
            ¡Jugar!
          </Link>
        </div>
      )}

      <h2>Tu aventura</h2>
      <ol className="challenge-list">
        {challenges.map((c) => {
          const state: 'done' | 'current' | 'future' = completed.has(c.id)
            ? 'done'
            : c.slug === next
              ? 'current'
              : 'future'
          return (
            <ChallengeRow
              key={c.id}
              title={c.title}
              href={`/challenge/${c.slug}`}
              state={state}
              stars={starsById.get(c.id) ?? 0}
            />
          )
        })}
      </ol>
    </main>
  )
}
