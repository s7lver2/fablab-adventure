import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../db/schema'
import { UserRepository } from '../users/repository'
import { resolveUserFromCookie } from './server'
import { signSession } from './cookie'

const SECRET = 'test-secret-1234'

describe('resolveUserFromCookie', () => {
  it('devuelve null si no hay cookie', () => {
    const db = new Database(':memory:')
    createSchema(db)
    expect(resolveUserFromCookie(undefined, SECRET, new UserRepository(db))).toBeNull()
  })

  it('resuelve el usuario a partir de una cookie válida', () => {
    const db = new Database(':memory:')
    createSchema(db)
    const repo = new UserRepository(db)
    const user = repo.findOrCreateByUsername('ana')
    const token = signSession({ userId: user.id }, SECRET)
    const resolved = resolveUserFromCookie(token, SECRET, repo)
    expect(resolved?.username).toBe('ana')
  })
})
