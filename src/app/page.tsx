import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { CurriculumRepository } from '@/lib/curriculum/repository'
import { ProgressRepository } from '@/lib/progress/repository'
import { getCurrentUser } from '@/lib/session/server'
import { nextChallengeSlug } from '@/lib/progress/next'

export default async function HomePage() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!user) redirect('/login')

  const curriculum = new CurriculumRepository(db)
  const progress = new ProgressRepository(db)
  const challenges = curriculum.listChallenges()
  const completed = new Set(progress.completedChallengeIds(user.id))
  const next = nextChallengeSlug(challenges, [...completed])

  return (
    <main style={{ maxWidth: 640, margin: '2rem auto', fontFamily: 'system-ui' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Hola, {user.displayName}</h1>
        <Link href="/profile">Mi perfil</Link>
      </header>
      {next && (
        <p>
          Siguiente lección: <Link href={`/challenge/${next}`}>empezar →</Link>
        </p>
      )}
      <ol>
        {challenges.map((c) => (
          <li key={c.id}>
            <Link href={`/challenge/${c.slug}`}>{c.title}</Link>{' '}
            {completed.has(c.id) ? '✓' : ''}
          </li>
        ))}
      </ol>
    </main>
  )
}
