import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../db/schema'
import { UserRepository } from './repository'

function freshRepo() {
  const db = new Database(':memory:')
  createSchema(db)
  return new UserRepository(db)
}

describe('UserRepository', () => {
  it('crea un usuario nuevo al hacer login por primera vez', () => {
    const repo = freshRepo()
    const user = repo.findOrCreateByUsername('ana')
    expect(user.username).toBe('ana')
    expect(user.role).toBe('user')
    expect(user.hidden).toBe(false)
    expect(user.displayName).toBe('ana')
  })

  it('devuelve el mismo usuario en logins posteriores', () => {
    const repo = freshRepo()
    const a = repo.findOrCreateByUsername('ana')
    const b = repo.findOrCreateByUsername('ana')
    expect(b.id).toBe(a.id)
  })

  it('actualiza el perfil', () => {
    const repo = freshRepo()
    const user = repo.findOrCreateByUsername('ana')
    repo.updateProfile(user.id, { displayName: 'Ana G.', avatar: 'cat', profileMessage: 'hola' })
    const updated = repo.findById(user.id)!
    expect(updated.displayName).toBe('Ana G.')
    expect(updated.avatar).toBe('cat')
    expect(updated.profileMessage).toBe('hola')
  })

  it('no permite registrarse con el username reservado root', () => {
    const repo = freshRepo()
    expect(() => repo.findOrCreateByUsername('root')).toThrow()
  })
})
