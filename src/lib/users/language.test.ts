import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../db/schema'
import { UserRepository } from './repository'

describe('UserRepository language', () => {
  let db: Database.Database
  let repo: UserRepository

  beforeEach(() => {
    db = new Database(':memory:')
    createSchema(db)
    repo = new UserRepository(db)
  })

  it('chosenLanguage es null por defecto', () => {
    const user = repo.findOrCreateByUsername('tester')
    expect(user.chosenLanguage).toBeNull()
  })

  it('setLanguage persiste y findById lo refleja', () => {
    const user = repo.findOrCreateByUsername('tester')
    repo.setLanguage(user.id, 'js')
    expect(repo.findById(user.id)!.chosenLanguage).toBe('js')
  })

  it('acepta python y blocks', () => {
    const user = repo.findOrCreateByUsername('tester2')
    repo.setLanguage(user.id, 'python')
    expect(repo.findById(user.id)!.chosenLanguage).toBe('python')
    repo.setLanguage(user.id, 'blocks')
    expect(repo.findById(user.id)!.chosenLanguage).toBe('blocks')
  })
})
