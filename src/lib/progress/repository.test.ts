import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../db/schema'
import { seedCurriculum } from '../curriculum/seed'
import { UserRepository } from '../users/repository'
import { ProgressRepository } from './repository'

function setup() {
  const db = new Database(':memory:')
  createSchema(db)
  seedCurriculum(db)
  const users = new UserRepository(db)
  const user = users.findOrCreateByUsername('ana')
  const challengeId = (db.prepare("SELECT id FROM challenges WHERE slug='saludo'").get() as any).id
  return { repo: new ProgressRepository(db), userId: user.id, challengeId }
}

describe('ProgressRepository', () => {
  it('registra un intento incrementando el contador', () => {
    const { repo, userId, challengeId } = setup()
    repo.recordAttempt(userId, challengeId, { stars: 0, hintsUsed: 0, completed: false })
    repo.recordAttempt(userId, challengeId, { stars: 3, hintsUsed: 0, completed: true })
    const p = repo.get(userId, challengeId)!
    expect(p.attempts).toBe(2)
    expect(p.stars).toBe(3)
    expect(p.status).toBe('completed')
  })

  it('no baja las estrellas ya conseguidas', () => {
    const { repo, userId, challengeId } = setup()
    repo.recordAttempt(userId, challengeId, { stars: 3, hintsUsed: 0, completed: true })
    repo.recordAttempt(userId, challengeId, { stars: 1, hintsUsed: 0, completed: true })
    expect(repo.get(userId, challengeId)!.stars).toBe(3)
  })

  it('lista los retos completados de un usuario', () => {
    const { repo, userId, challengeId } = setup()
    repo.recordAttempt(userId, challengeId, { stars: 2, hintsUsed: 0, completed: true })
    expect(repo.completedChallengeIds(userId)).toContain(challengeId)
  })
})
