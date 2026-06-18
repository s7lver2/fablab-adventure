import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { CurriculumRepository } from '@/lib/curriculum/repository'
import { ProgressRepository } from '@/lib/progress/repository'
import { getCurrentUser, getChosenLanguage } from '@/lib/session/server'
import { nextChallengeSlug } from '@/lib/progress/next'
import { TopNav } from '@/components/TopNav'
import { StatCard } from '@/components/StatCard'
import { ConceptSection } from '@/components/ConceptSection'

const LANG_LABEL: Record<string, string> = {
  js: '⚡ JavaScript',
  python: '🐍 Python',
  blocks: '🧩 Bloques',
}

export default async function DashboardPage() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!user) redirect('/login')
  const chosenLanguage = await getChosenLanguage(user.chosenLanguage)
  if (!chosenLanguage) redirect('/onboarding')

  const curriculum = new CurriculumRepository(db)
  const progress = new ProgressRepository(db)
  const concepts = curriculum.listConceptsWithChallenges()
  const allChallenges = concepts.flatMap((c) => c.challenges)
  const completed = new Set(progress.completedChallengeIds(user.id))
  const next = nextChallengeSlug(allChallenges, [...completed])

  const starsById = new Map<number, number>()
  for (const c of allChallenges) {
    starsById.set(c.id, progress.get(user.id, c.id)?.stars ?? 0)
  }
  const totalStars = [...starsById.values()].reduce((a, b) => a + b, 0)
  const challengesDone = completed.size
  const nextChallenge = allChallenges.find((c) => c.slug === next)

  return (
    <div>
      <TopNav
        avatar={user.avatar}
        avatarImage={user.avatarImage}
        displayName={user.displayName}
      />
      <main className="page">
        <div className="greeting">
          <div>
            <h1>{'¡Hola, ' + user.displayName + '!'}</h1>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 700 }}>
              {chosenLanguage ? LANG_LABEL[chosenLanguage] : ''}
            </span>
          </div>
        </div>

        <div className="stats-row">
          <StatCard label="Estrellas" value={'⭐ ' + totalStars} />
          <StatCard label="Completados" value={'🏆 ' + challengesDone} />
          <StatCard
            label="Progreso"
            value={String(allChallenges.length > 0 ? Math.round((challengesDone / allChallenges.length) * 100) : 0) + '%'}
          />
        </div>

        {next && nextChallenge && (
          <div className="mission">
            <div>
              <h2>Siguiente misión</h2>
              <p>{nextChallenge.title}</p>
            </div>
            <Link href={`/challenge/${next}`} className="btn">¡Jugar!</Link>
          </div>
        )}

        {!next && challengesDone > 0 && (
          <div className="mission" style={{ borderColor: 'var(--green)', boxShadow: '0 5px 0 var(--green-dark)' }}>
            <div>
              <h2>🎉 ¡Curso completado!</h2>
              <p>Has terminado todos los retos. ¡Eres increíble!</p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
          {concepts.map((concept) => (
            <ConceptSection
              key={concept.id}
              name={concept.name}
              challenges={concept.challenges}
              completed={completed}
              stars={starsById}
              next={next}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
