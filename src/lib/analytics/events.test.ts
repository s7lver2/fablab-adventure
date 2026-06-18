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

  it('topCountries devuelve países agrupados en orden descendente', () => {
    const { db, logger } = setup()
    // Insertar eventos con país ES (3), MX (2), AR (1)
    db.prepare('INSERT INTO events (type, created_at, country) VALUES (?, ?, ?)').run('page_view', Date.now(), 'ES')
    db.prepare('INSERT INTO events (type, created_at, country) VALUES (?, ?, ?)').run('page_view', Date.now(), 'ES')
    db.prepare('INSERT INTO events (type, created_at, country) VALUES (?, ?, ?)').run('page_view', Date.now(), 'ES')
    db.prepare('INSERT INTO events (type, created_at, country) VALUES (?, ?, ?)').run('page_view', Date.now(), 'MX')
    db.prepare('INSERT INTO events (type, created_at, country) VALUES (?, ?, ?)').run('page_view', Date.now(), 'MX')
    db.prepare('INSERT INTO events (type, created_at, country) VALUES (?, ?, ?)').run('page_view', Date.now(), 'AR')
    const countries = logger.topCountries(30)
    expect(countries).toHaveLength(3)
    expect(countries[0].country).toBe('ES')
    expect(countries[0].count).toBe(3)
    expect(countries[1].country).toBe('MX')
    expect(countries[1].count).toBe(2)
    expect(countries[2].country).toBe('AR')
    expect(countries[2].count).toBe(1)
  })

  it('topCities devuelve ciudades agrupadas en orden descendente', () => {
    const { db, logger } = setup()
    // Insertar eventos con ciudades
    db.prepare('INSERT INTO events (type, created_at, country, city) VALUES (?, ?, ?, ?)').run('page_view', Date.now(), 'ES', 'Madrid')
    db.prepare('INSERT INTO events (type, created_at, country, city) VALUES (?, ?, ?, ?)').run('page_view', Date.now(), 'ES', 'Madrid')
    db.prepare('INSERT INTO events (type, created_at, country, city) VALUES (?, ?, ?, ?)').run('page_view', Date.now(), 'ES', 'Barcelona')
    db.prepare('INSERT INTO events (type, created_at, country, city) VALUES (?, ?, ?, ?)').run('page_view', Date.now(), 'MX', 'CDMX')
    const cities = logger.topCities(30)
    expect(cities).toHaveLength(3)
    expect(cities[0].city).toBe('Madrid')
    expect(cities[0].country).toBe('ES')
    expect(cities[0].count).toBe(2)
    expect(cities[1].city).toBe('Barcelona')
    expect(cities[1].count).toBe(1)
  })

  it('topCountries respeta el filtro de días', () => {
    const { db, logger } = setup()
    const now = Date.now()
    const pastDay = now - 31 * 86400000 // 31 days ago
    db.prepare('INSERT INTO events (type, created_at, country) VALUES (?, ?, ?)').run('page_view', now, 'ES')
    db.prepare('INSERT INTO events (type, created_at, country) VALUES (?, ?, ?)').run('page_view', pastDay, 'MX')
    const countries = logger.topCountries(30)
    expect(countries).toHaveLength(1)
    expect(countries[0].country).toBe('ES')
  })

  it('byDayHour devuelve matriz 7x24 con conteos por día y hora', () => {
    const { db, logger } = setup()
    const now = Date.now()
    const monday = new Date(now)
    monday.setDay = (d: number) => { monday.setDate(monday.getDate() - monday.getDay() + d) }
    // Simular eventos en lunes a las 10:00 y martes a las 14:00
    db.prepare('INSERT INTO events (type, created_at) VALUES (?, ?)').run('page_view', now)
    db.prepare('INSERT INTO events (type, created_at) VALUES (?, ?)').run('page_view', now)
    const grid = logger.byDayHour(30)
    expect(grid).toHaveLength(7)
    expect(grid[0]).toHaveLength(24)
    expect(grid[0].every((v: number) => typeof v === 'number')).toBe(true)
  })

  it('pageSeries devuelve datos de tráfico por página en los últimos días', () => {
    const { db, logger } = setup()
    const now = Date.now()
    db.prepare('INSERT INTO events (type, created_at, path) VALUES (?, ?, ?)').run('page_view', now, '/home')
    db.prepare('INSERT INTO events (type, created_at, path) VALUES (?, ?, ?)').run('page_view', now, '/home')
    db.prepare('INSERT INTO events (type, created_at, path) VALUES (?, ?, ?)').run('page_view', now, '/about')
    const result = logger.pageSeries(7, 2)
    expect(result.labels).toHaveLength(7)
    expect(result.series.length).toBeLessThanOrEqual(2)
    expect(result.series.every((s: any) => s.path && s.data && s.data.length === 7)).toBe(true)
  })
})
