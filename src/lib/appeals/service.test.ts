import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../db/schema'
import { seedCurriculum } from '../curriculum/seed'
import { UserRepository } from '../users/repository'
import { AppealRepository } from './repository'
import { SettingsRepository } from '../settings/repository'
import { submitAppeal } from './service'

function setup() {
  const db = new Database(':memory:')
  createSchema(db)
  seedCurriculum(db)
  const user = new UserRepository(db).findOrCreateByUsername('ana')
  return {
    db,
    userId: user.id,
    appeals: new AppealRepository(db),
    settings: new SettingsRepository(db),
  }
}

describe('submitAppeal', () => {
  it('crea la primera apelación', () => {
    const { appeals, settings, userId } = setup()
    const res = submitAppeal(
      { appeals, settings },
      { userId, challengeId: 1, language: 'js', submittedCode: 'x', submittedOutput: 'y', message: 'vale' },
    )
    expect(res.ok).toBe(true)
    expect(appeals.listByUser(userId)).toHaveLength(1)
  })

  it('rechaza una segunda apelación pendiente para el mismo reto', () => {
    const { appeals, settings, userId } = setup()
    submitAppeal({ appeals, settings }, { userId, challengeId: 1, language: 'js', submittedCode: 'x', submittedOutput: 'y', message: '' })
    const res = submitAppeal({ appeals, settings }, { userId, challengeId: 1, language: 'js', submittedCode: 'x2', submittedOutput: 'y2', message: '' })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/pendiente/i)
    expect(appeals.listByUser(userId)).toHaveLength(1)
  })
})
