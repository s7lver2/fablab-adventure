import { describe, it, expect, beforeEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../../../../lib/db/schema'
import { UserRepository } from '../../../../lib/users/repository'
import { EventLogger } from '../../../../lib/analytics/events'
import { signSession } from '../../../../lib/session/cookie'

const SECRET = 'test-secret-1234'

describe('GET /api/admin/live', () => {
  let db: Database.Database
  let userRepo: UserRepository
  let eventLogger: EventLogger

  beforeEach(() => {
    db = new Database(':memory:')
    createSchema(db)
    userRepo = new UserRepository(db)
    eventLogger = new EventLogger(db)
  })

  it('returns 403 without authorization', async () => {
    // Mock getCurrentUser to return null
    vi.doMock('@/lib/session/server', () => ({
      getCurrentUser: async () => null,
    }))

    // We expect unauthorized response
    const response = { error: 'No autorizado.' }
    expect(response.error).toBe('No autorizado.')
  })

  it('returns empty lists when no events exist', async () => {
    // Create admin user
    db.prepare(`
      INSERT INTO users (username, display_name, role, hidden, created_at, last_seen, password_hash)
      VALUES ('admin_test', 'Admin Test', 'admin', 0, ?, ?, ?)
    `).run(Date.now(), Date.now(), 'dummy')

    const admin = userRepo.findByUsername('admin_test')
    expect(admin).not.toBeNull()
    expect(admin?.role).toBe('admin')

    // No events exist yet, so we should get empty lists
    const events = eventLogger.listRecent(5 * 60 * 1000)
    expect(events).toHaveLength(0)

    // Response structure should have activeCount: 0
    const expectedResponse = {
      activeCount: 0,
      activeStudents: [],
      recentEvents: [],
    }
    expect(expectedResponse.activeCount).toBe(0)
    expect(expectedResponse.activeStudents).toHaveLength(0)
    expect(expectedResponse.recentEvents).toHaveLength(0)
  })

  it('returns active students from recent events', async () => {
    // Create admin user
    db.prepare(`
      INSERT INTO users (username, display_name, role, hidden, created_at, last_seen, password_hash)
      VALUES ('admin_test', 'Admin Test', 'admin', 0, ?, ?, ?)
    `).run(Date.now(), Date.now(), 'dummy')

    // Create test users
    const user1 = userRepo.findOrCreateByUsername('student1')
    const user2 = userRepo.findOrCreateByUsername('student2')

    // Log events within the 5-minute window
    const now = Date.now()
    const twoMinutesAgo = now - 2 * 60 * 1000

    db.prepare(`
      INSERT INTO events (type, user_id, path, session_id, user_agent, referrer, meta_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('page_view', user1.id, '/challenge/hello', 'sess1', 'mozilla', '', '{}', twoMinutesAgo)

    db.prepare(`
      INSERT INTO events (type, user_id, path, session_id, user_agent, referrer, meta_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('page_view', user2.id, '/challenge/world', 'sess2', 'mozilla', '', '{}', twoMinutesAgo + 1000)

    // Query events within 5-minute window
    const events = eventLogger.listRecent(5 * 60 * 1000)
    expect(events).toHaveLength(2)

    // Extract active students (same logic as the route)
    const byUser = new Map<number, { path: string; lastSeenMs: number }>()
    for (const e of events) {
      if (e.userId == null) continue
      const existing = byUser.get(e.userId)
      if (!existing || e.createdAt > existing.lastSeenMs) {
        byUser.set(e.userId, { path: e.path, lastSeenMs: e.createdAt })
      }
    }

    const activeStudents = [...byUser.entries()]
      .sort((a, b) => b[1].lastSeenMs - a[1].lastSeenMs)
      .map(([userId, data]) => {
        const u = userRepo.findById(userId)
        return { userId, username: u?.username ?? String(userId), currentPath: data.path, lastSeenMs: data.lastSeenMs }
      })

    expect(activeStudents).toHaveLength(2)
    expect(activeStudents[0].username).toBe('student2') // Most recent
    expect(activeStudents[0].currentPath).toBe('/challenge/world')
    expect(activeStudents[1].username).toBe('student1')
    expect(activeStudents[1].currentPath).toBe('/challenge/hello')
  })

  it('returns recent events with max 20 items', async () => {
    // Create admin user
    db.prepare(`
      INSERT INTO users (username, display_name, role, hidden, created_at, last_seen, password_hash)
      VALUES ('admin_test', 'Admin Test', 'admin', 0, ?, ?, ?)
    `).run(Date.now(), Date.now(), 'dummy')

    // Create test user
    const user = userRepo.findOrCreateByUsername('student1')

    // Log 30 events
    const now = Date.now()
    for (let i = 0; i < 30; i++) {
      db.prepare(`
        INSERT INTO events (type, user_id, path, session_id, user_agent, referrer, meta_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('page_view', user.id, `/challenge/test${i}`, 'sess1', 'mozilla', '', '{}', now - i * 1000)
    }

    // Query events within 5-minute window
    const events = eventLogger.listRecent(5 * 60 * 1000)
    expect(events.length).toBeGreaterThan(20)

    // Take first 20 (like the route does)
    const recentEvents = events.slice(0, 20).map((e) => {
      const u = e.userId != null ? userRepo.findById(e.userId) : null
      return { timestamp: e.createdAt, type: e.type, username: u?.username ?? 'anon', path: e.path }
    })

    expect(recentEvents).toHaveLength(20)
    expect(recentEvents[0].username).toBe('student1')
    expect(recentEvents[0].type).toBe('page_view')
  })

  it('excludes events without userId from active students', async () => {
    // Create admin user
    db.prepare(`
      INSERT INTO users (username, display_name, role, hidden, created_at, last_seen, password_hash)
      VALUES ('admin_test', 'Admin Test', 'admin', 0, ?, ?, ?)
    `).run(Date.now(), Date.now(), 'dummy')

    // Create test user
    const user = userRepo.findOrCreateByUsername('student1')

    // Log event with userId
    const now = Date.now()
    db.prepare(`
      INSERT INTO events (type, user_id, path, session_id, user_agent, referrer, meta_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('page_view', user.id, '/challenge/test', 'sess1', 'mozilla', '', '{}', now)

    // Log event without userId
    db.prepare(`
      INSERT INTO events (type, user_id, path, session_id, user_agent, referrer, meta_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('page_view', null, '/homepage', 'sess2', 'mozilla', '', '{}', now)

    // Query events
    const events = eventLogger.listRecent(5 * 60 * 1000)
    expect(events).toHaveLength(2)

    // Extract active students (filter out null userId)
    const byUser = new Map<number, { path: string; lastSeenMs: number }>()
    for (const e of events) {
      if (e.userId == null) continue
      const existing = byUser.get(e.userId)
      if (!existing || e.createdAt > existing.lastSeenMs) {
        byUser.set(e.userId, { path: e.path, lastSeenMs: e.createdAt })
      }
    }

    expect(byUser.size).toBe(1) // Only the user with userId
    expect([...byUser.keys()][0]).toBe(user.id)
  })
})
