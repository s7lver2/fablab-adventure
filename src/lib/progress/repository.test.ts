import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../db/schema'
import { seedCurriculum } from '../curriculum/seed'
import { UserRepository } from '../users/repository'
import { CurriculumRepository } from '../curriculum/repository'
import { ProgressRepository } from './repository'

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

describe('ProgressRepository', () => {
  it('registra un intento y actualiza el contador', () => {
    const { progressRepo, user, curriculumRepo } = setup()
    const challenge = curriculumRepo.listChallenges()[0]

    progressRepo.recordAttempt(user.id, challenge.id, { correct: false, attempts: 1, hintsUsed: 0 })

    const progress = progressRepo.getProgress(user.id, challenge.id)
    expect(progress.attempts).toBe(1)
    expect(progress.stars).toBe(0)
  })

  it('no baja estrellas si ya tenía más', () => {
    const { progressRepo, user, curriculumRepo } = setup()
    const challenge = curriculumRepo.listChallenges()[0]

    // Primer intento correcto: 3 estrellas
    progressRepo.recordAttempt(user.id, challenge.id, { correct: true, attempts: 1, hintsUsed: 0 })
    let progress = progressRepo.getProgress(user.id, challenge.id)
    expect(progress.stars).toBe(3)

    // Segundo intento incorrecto: mantiene 3 estrellas
    progressRepo.recordAttempt(user.id, challenge.id, { correct: false, attempts: 2, hintsUsed: 0 })
    progress = progressRepo.getProgress(user.id, challenge.id)
    expect(progress.stars).toBe(3)
  })

  it('devuelve los IDs de retos completados', () => {
    const { progressRepo, user, curriculumRepo } = setup()
    const challenges = curriculumRepo.listChallenges()

    progressRepo.recordAttempt(user.id, challenges[0].id, { correct: true, attempts: 1, hintsUsed: 0 })
    progressRepo.recordAttempt(user.id, challenges[1].id, { correct: false, attempts: 1, hintsUsed: 0 })

    const completed = progressRepo.completedChallengeIds(user.id)
    expect(completed).toContain(challenges[0].id)
    expect(completed).not.toContain(challenges[1].id)
  })
})
