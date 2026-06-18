import Link from 'next/link'
import { StarRating } from './StarRating'
import { ProgressBar } from './ProgressBar'
import type { ChallengeSummary } from '@/lib/curriculum/types'

type Group = { key: string; title: string | null; items: ChallengeSummary[] }

function buildGroups(challenges: ChallengeSummary[]): Group[] {
  const groups: Group[] = []
  for (const c of challenges) {
    const key = c.groupName ?? c.slug
    const last = groups[groups.length - 1]
    if (last?.key === key) {
      last.items.push(c)
    } else {
      groups.push({ key, title: c.groupName ?? null, items: [c] })
    }
  }
  return groups
}

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
  const groups = buildGroups(challenges)
  const globalNums = new Map(challenges.map((c, i) => [c.id, i + 1]))

  return (
    <section className={`concept-section${!isUnlocked ? ' concept-section--locked' : ''}`}>
      <div className="concept-section__header">
        <h2>{name}</h2>
        <div className="concept-section__meta">
          <span className="concept-section__count">{done}/{challenges.length}</span>
          <ProgressBar done={done} total={challenges.length} />
        </div>
      </div>
      <div className="concept-section__groups">
        {groups.map((group) => (
          <div key={group.key} className="challenge-group">
            {group.title && (
              <p className="challenge-group__title">{group.title}</p>
            )}
            <ol className="challenge-list">
              {group.items.map((c) => {
                const isDone = completed.has(c.id)
                const isCurrent = c.slug === next
                const state: 'done' | 'current' | 'future' = isDone ? 'done' : isCurrent ? 'current' : 'future'
                return (
                  <li key={c.id}>
                    <Link href={`/challenge/${c.slug}`} className={`challenge challenge--${state}`}>
                      <span className="challenge__title">
                        <span className="challenge__num">{globalNums.get(c.id)}.</span>
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
          </div>
        ))}
      </div>
    </section>
  )
}
