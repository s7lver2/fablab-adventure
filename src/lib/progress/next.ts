import type { CurriculumRepository } from '../curriculum/repository'
import type { ProgressRepository } from './repository'

/**
 * Finds the next challenge in linear order.
 * Returns the slug of the first non-completed challenge, or null if all are completed.
 */
export function nextChallengeSlug(
  curriculum: CurriculumRepository,
  progress: ProgressRepository,
  userId: number,
): string | null {
  const completed = progress.completedChallengeIds(userId)
  const completedSet = new Set(completed)

  const challenges = curriculum.listChallenges()
  for (const challenge of challenges) {
    if (!completedSet.has(challenge.id)) {
      return challenge.slug
    }
  }

  return null
}
