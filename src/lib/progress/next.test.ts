import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../db/schema'
import { seedCurriculum } from '../curriculum/seed'
import { UserRepository } from '../users/repository'
import { CurriculumRepository } from '../curriculum/repository'
import { ProgressRepository } from './repository'
import { nextChallengeSlug } from './next'

function setup() {
  const db = new Database(':memory:')
  createSchema(db)
  seedCurriculum(db)
  const userRepo = new UserRepository(db)
  const curriculumRepo = new CurriculumRepository(db)
  const progressRepo = new ProgressRepository(db)
  const user = userRepo.findOrCreateByUsername('test-user')
  return { db, userRepo, curriculumRepo, progressRepo, user }
}

describe('nextChallengeSlug', () => {
  it('devuelve el primer reto si no hay ninguno completado', () => {
    const { progressRepo, user, curriculumRepo } = setup()
    const challenges = curriculumRepo.listChallenges()

    const next = nextChallengeSlug(curriculumRepo, progressRepo, user.id)
    expect(next).toBe(challenges[0].slug)
  })

  it('devuelve el siguiente reto después del último completado', () => {
    const { progressRepo, user, curriculumRepo } = setup()
    const challenges = curriculumRepo.listChallenges().slice(0, 3)

    // Completar el primer reto
    progressRepo.recordAttempt(user.id, challenges[0].id, { correct: true, attempts: 1, hintsUsed: 0 })

    const next = nextChallengeSlug(curriculumRepo, progressRepo, user.id)
    expect(next).toBe(challenges[1].slug)
  })

  it('devuelve null cuando no hay más retos', () => {
    const { progressRepo, user, curriculumRepo } = setup()
    const challenges = curriculumRepo.listChallenges()

    // Completar todos los retos
    for (const challenge of challenges) {
      progressRepo.recordAttempt(user.id, challenge.id, { correct: true, attempts: 1, hintsUsed: 0 })
    }

    const next = nextChallengeSlug(curriculumRepo, progressRepo, user.id)
    expect(next).toBeNull()
  })
})
