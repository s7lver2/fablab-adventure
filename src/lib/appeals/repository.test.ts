import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../db/schema'
import { seedCurriculum } from '../curriculum/seed'
import { UserRepository } from '../users/repository'
import { AppealRepository } from './repository'

function setup() {
  const db = new Database(':memory:')
  createSchema(db)
  seedCurriculum(db)
  const user = new UserRepository(db).findOrCreateByUsername('ana')
  const challengeId = (db.prepare("SELECT id FROM challenges WHERE slug='saludo'").get() as { id: number }).id
  return { repo: new AppealRepository(db), userId: user.id, challengeId, db }
}

describe('AppealRepository', () => {
  it('crea una apelación y la lista por usuario', () => {
    const { repo, userId, challengeId } = setup()
    const id = repo.create({
      userId, challengeId, language: 'js',
      submittedCode: 'print("hola")', submittedOutput: 'hola', message: 'creo que vale',
    })
    expect(id).toBeGreaterThan(0)
    const mine = repo.listByUser(userId)
    expect(mine).toHaveLength(1)
    expect(mine[0].status).toBe('pending')
    expect(mine[0].submittedCode).toBe('print("hola")')
  })

  it('cuenta pendientes por reto y globales', () => {
    const { repo, userId, challengeId } = setup()
    repo.create({ userId, challengeId, language: 'js', submittedCode: 'x', submittedOutput: 'y', message: '' })
    expect(repo.countPendingForChallenge(userId, challengeId)).toBe(1)
    expect(repo.countPendingGlobal(userId)).toBe(1)
  })

  it('lastRejectedAt es null si no hay rechazos', () => {
    const { repo, userId, challengeId } = setup()
    expect(repo.lastRejectedAt(userId, challengeId)).toBeNull()
  })
})
