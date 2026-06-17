import type { ChallengeSummary } from '../curriculum/types'

/** Lineal: el primer reto (por orden) que el usuario aún no ha completado. */
export function nextChallengeSlug(
  challenges: ChallengeSummary[],
  completedIds: number[],
): string | null {
  const done = new Set(completedIds)
  const ordered = [...challenges].sort((a, b) => a.ord - b.ord || a.id - b.id)
  const next = ordered.find((c) => !done.has(c.id))
  return next ? next.slug : null
}
