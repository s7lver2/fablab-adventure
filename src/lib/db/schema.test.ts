import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from './schema'

describe('createSchema', () => {
  it('crea las tablas esperadas', () => {
    const db = new Database(':memory:')
    createSchema(db)
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r: any) => r.name)
    expect(tables).toEqual(
      expect.arrayContaining([
        'users', 'concepts', 'challenges', 'challenge_variants',
        'test_cases', 'progress', 'settings',
      ]),
    )
  })

  it('siembra una cuenta root oculta y admin', () => {
    const db = new Database(':memory:')
    createSchema(db)
    const root: any = db.prepare("SELECT * FROM users WHERE username = 'root'").get()
    expect(root).toBeTruthy()
    expect(root.role).toBe('root')
    expect(root.hidden).toBe(1)
    expect(root.password_hash).toBeTruthy()
  })
})
