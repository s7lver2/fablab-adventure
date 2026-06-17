import Link from 'next/link'
import { StarRating } from './StarRating'
import { ProgressBar } from './ProgressBar'
import type { ChallengeSummary } from '@/lib/curriculum/types'

export function ConceptSection({
  name,
  challenges,
  completed,
  stars,
  next,
}: {
  name: string
  challenges: ChallengeSummary[]
  completed: Set<number>
  stars: Map<number, number>
  next: string | null
}) {
  const done = challenges.filter((c) => completed.has(c.id)).length
  const isUnlocked = done > 0 || challenges[0]?.slug === next
  return (
    <section className={`concept-section${!isUnlocked ? ' concept-section--locked' : ''}`}>
      <div className="concept-section__header">
        <h2>{name}</h2>
        <div className="concept-section__meta">
          <span className="concept-section__count">{done}/{challenges.length}</span>
          <ProgressBar done={done} total={challenges.length} />
        </div>
      </div>
      <ol className="challenge-list">
        {challenges.map((c, idx) => {
          const isDone = completed.has(c.id)
          const isCurrent = c.slug === next
          const state: 'done' | 'current' | 'future' = isDone ? 'done' : isCurrent ? 'current' : 'future'
          return (
            <li key={c.id}>
              <Link href={`/challenge/${c.slug}`} className={`challenge challenge--${state}`}>
                <span className="challenge__title">
                  <span className="challenge__num">{idx + 1}.</span>
                  {isDone && <span aria-label="completado">✅</span>}
                  {!isDone && !isCurrent && !isUnlocked && <span aria-label="bloqueado">🔒</span>}
                  {c.title}
                </span>
                {isDone ? (
                  <StarRating stars={stars.get(c.id) ?? 0} />
                ) : isCurrent ? (
                  <span className="challenge__cta">¡seguir! →</span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
