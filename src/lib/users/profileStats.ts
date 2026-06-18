import type Database from 'better-sqlite3'
import type { User } from './types'
import { CurriculumRepository } from '../curriculum/repository'
import { ProgressRepository } from '../progress/repository'

export interface Badge {
  id: string
  icon: string
  label: string
}

export interface MasteryAxis {
  concept: string
  pct: number
}

export interface RecentLesson {
  slug: string
  title: string
  stars: number
  completedAt: number
}

export interface PublicProfile {
  username: string
  displayName: string
  avatar: string
  banner: string
  bannerImage: string | null
  profileMessage: string
  role: User['role']
  createdAt: number
  lastSeen: number
  totalStars: number
  challengesDone: number
  mastery: MasteryAxis[]
  recentLessons: RecentLesson[]
  badges: Badge[]
}

const LANG_BADGE: Record<string, Badge> = {
  python: { id: 'lang-python', icon: '🐍', label: 'Python' },
  js: { id: 'lang-js', icon: '⚡', label: 'JavaScript' },
  blocks: { id: 'lang-blocks', icon: '🧩', label: 'Bloques' },
}

export function buildProfile(db: Database.Database, user: User): PublicProfile {
  const curriculum = new CurriculumRepository(db)
  const progress = new ProgressRepository(db)

  const concepts = curriculum.listConceptsWithChallenges()
  const challenges = curriculum.listChallenges()
  const titleBySlugId = new Map<number, { slug: string; title: string }>()
  for (const c of challenges) titleBySlugId.set(c.id, { slug: c.slug, title: c.title })

  const completed = new Set(progress.completedChallengeIds(user.id))

  let totalStars = 0
  let fullConcepts = 0
  const mastery: MasteryAxis[] = []
  for (const concept of concepts) {
    let doneInConcept = 0
    for (const ch of concept.challenges) {
      totalStars += progress.get(user.id, ch.id)?.stars ?? 0
      if (completed.has(ch.id)) doneInConcept++
    }
    const total = concept.challenges.length
    const pct = total > 0 ? Math.round((doneInConcept / total) * 100) : 0
    mastery.push({ concept: concept.name, pct })
    if (total > 0 && doneInConcept === total) fullConcepts++
  }

  const recentLessons: RecentLesson[] = progress.recentCompleted(user.id, 5).map((r) => {
    const meta = titleBySlugId.get(r.challengeId)
    return { slug: meta?.slug ?? String(r.challengeId), title: meta?.title ?? 'Reto', stars: r.stars, completedAt: r.completedAt }
  })

  const challengesDone = completed.size
  const allDone = challenges.length > 0 && challengesDone === challenges.length

  const badges: Badge[] = []
  if (user.role === 'root') badges.push({ id: 'root', icon: '👑', label: 'Root' })
  if (user.role === 'admin') badges.push({ id: 'admin', icon: '🛡️', label: 'Admin' })
  if (user.chosenLanguage && LANG_BADGE[user.chosenLanguage]) badges.push(LANG_BADGE[user.chosenLanguage])
  if (challengesDone >= 1) badges.push({ id: 'first', icon: '🚀', label: 'Primer reto' })
  if (totalStars >= 50) badges.push({ id: 'stars-50', icon: '💫', label: '50 estrellas' })
  else if (totalStars >= 25) badges.push({ id: 'stars-25', icon: '🌟', label: '25 estrellas' })
  else if (totalStars >= 10) badges.push({ id: 'stars-10', icon: '⭐', label: '10 estrellas' })
  if (fullConcepts >= 1) badges.push({ id: 'concept', icon: '🏅', label: `${fullConcepts} concepto(s) dominado(s)` })
  if (allDone) badges.push({ id: 'all', icon: '🏆', label: '¡Todo completado!' })

  return {
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    banner: user.banner,
    bannerImage: user.bannerImage,
    profileMessage: user.profileMessage,
    role: user.role,
    createdAt: user.createdAt,
    lastSeen: user.lastSeen,
    totalStars,
    challengesDone,
    mastery,
    recentLessons,
    badges,
  }
}
