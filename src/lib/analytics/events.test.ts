import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../db/schema'
import { EventLogger } from './events'

function setup() {
  const db = new Database(':memory:')
  createSchema(db)
  return { db, logger: new EventLogger(db) }
}

describe('EventLogger', () => {
  it('registra un evento y lo puede listar', () => {
    const { db, logger } = setup()
    logger.log({ type: 'login', userId: 1, path: '/login', sessionId: 's1', userAgent: 'UA', referrer: '', meta: { ok: true } })
    const rows = db.prepare('SELECT * FROM events').all() as { type: string; session_id: string; meta_json: string }[]
    expect(rows).toHaveLength(1)
    expect(rows[0].type).toBe('login')
    expect(rows[0].session_id).toBe('s1')
    expect(JSON.parse(rows[0].meta_json).ok).toBe(true)
  })

  it('listAll devuelve eventos normalizados', () => {
    const { logger } = setup()
    logger.log({ type: 'open_challenge', userId: 2, path: '/challenge/saludo', sessionId: 's2', userAgent: '', referrer: '', meta: {} })
    const all = logger.listAll()
    expect(all[0].type).toBe('open_challenge')
    expect(all[0].userId).toBe(2)
  })
})
