import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../../../../lib/db/schema'
import { UserRepository } from '../../../../lib/users/repository'
import { EventLogger } from '../../../../lib/analytics/events'

describe('GET /api/admin/sessions', () => {
  let db: Database.Database
  let userRepo: UserRepository
  let eventLogger: EventLogger

  beforeEach(() => {
    db = new Database(':memory:')
    createSchema(db)
    userRepo = new UserRepository(db)
    eventLogger = new EventLogger(db)
  })

  it('returns correct summary stats for sessions', () => {
    // Create test users
    const user1 = userRepo.findOrCreateByUsername('student1')
    const user2 = userRepo.findOrCreateByUsername('student2')

    // Create sessions with various properties
    const now = Date.now()
    const dayAgo = now - 24 * 60 * 60 * 1000

    // Session 1: 2 events (not a bounce), 1000ms duration
    db.prepare(`
      INSERT INTO events (type, user_id, path, session_id, user_agent, referrer, meta_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('page_view', user1.id, '/challenge/hello', 'sess1', 'Mozilla/5.0', '', '{}', dayAgo + 1000)

    db.prepare(`
      INSERT INTO events (type, user_id, path, session_id, user_agent, referrer, meta_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('page_view', user1.id, '/challenge/world', 'sess1', 'Mozilla/5.0', '', '{}', dayAgo + 2000)

    // Session 2: 1 event (bounce), 0ms duration
    db.prepare(`
      INSERT INTO events (type, user_id, path, session_id, user_agent, referrer, meta_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('page_view', user2.id, '/homepage', 'sess2', 'Mozilla/5.0', '', '{}', dayAgo + 3000)

    // Query sessions
    const sessions = eventLogger.listSessions(24 * 60 * 60 * 1000)

    // Calculate stats
    const avgDurationMs = sessions.length
      ? Math.round(sessions.reduce((acc, s) => acc + s.durationMs, 0) / sessions.length)
      : 0
    const bounceSessions = sessions.filter((s) => s.eventCount === 1).length
    const bounceRate = sessions.length ? Math.round((bounceSessions / sessions.length) * 100) : 0

    expect(sessions).toHaveLength(2)
    // Sessions are ordered by last_seen_at DESC, so sess2 (more recent) comes first
    expect(sessions[0].sessionId).toBe('sess2')
    expect(sessions[0].durationMs).toBe(0) // sess2 has only 1 event
    expect(sessions[1].sessionId).toBe('sess1')
    expect(sessions[1].durationMs).toBe(1000) // sess1 spans 1000ms (dayAgo+1000 to dayAgo+2000)
    expect(avgDurationMs).toBe(500) // (1000 + 0) / 2
    expect(bounceSessions).toBe(1)
    expect(bounceRate).toBe(50) // 1 out of 2
  })

  it('maps session data with username and device/browser info', () => {
    const user = userRepo.findOrCreateByUsername('testuser')
    const now = Date.now()

    // Log event with Chrome user agent
    db.prepare(`
      INSERT INTO events (type, user_id, path, session_id, user_agent, referrer, meta_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'page_view',
      user.id,
      '/challenge',
      'sess1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '',
      '{}',
      now,
    )

    const sessions = eventLogger.listSessions(24 * 60 * 60 * 1000)

    const sessionRow = sessions.map((s) => {
      const u = s.userId != null ? userRepo.findById(s.userId) : null
      const ua = {
        browser: /Edg\//i.test(s.userAgent)
          ? 'Edge'
          : /Chrome\//i.test(s.userAgent)
            ? 'Chrome'
            : /Firefox\//i.test(s.userAgent)
              ? 'Firefox'
              : /Safari\//i.test(s.userAgent)
                ? 'Safari'
                : 'Desconocido',
        device: /Mobile|Android|iPhone|iPad/i.test(s.userAgent) ? 'Móvil' : 'Escritorio',
      }
      return {
        sessionId: s.sessionId,
        username: u?.username ?? 'anónimo',
        startedAt: s.startedAt,
        durationMs: s.durationMs,
        eventCount: s.eventCount,
        device: ua.device,
        browser: ua.browser,
      }
    })[0]

    expect(sessionRow).toBeDefined()
    expect(sessionRow.username).toBe('testuser')
    expect(sessionRow.browser).toBe('Chrome')
    expect(sessionRow.device).toBe('Escritorio')
  })

  it('handles anonymous sessions without userId', () => {
    const now = Date.now()

    // Log event without userId
    db.prepare(`
      INSERT INTO events (type, user_id, path, session_id, user_agent, referrer, meta_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('page_view', null, '/homepage', 'sess_anon', 'Mozilla/5.0', '', '{}', now)

    const sessions = eventLogger.listSessions(24 * 60 * 60 * 1000)
    expect(sessions).toHaveLength(1)
    expect(sessions[0].userId).toBeNull()

    const sessionRow = sessions.map((s) => {
      const u = s.userId != null ? userRepo.findById(s.userId) : null
      return {
        sessionId: s.sessionId,
        username: u?.username ?? 'anónimo',
        startedAt: s.startedAt,
        durationMs: s.durationMs,
        eventCount: s.eventCount,
        device: 'Escritorio',
        browser: 'Desconocido',
      }
    })[0]

    expect(sessionRow.username).toBe('anónimo')
  })

  it('detects mobile devices correctly', () => {
    const user = userRepo.findOrCreateByUsername('mobileuser')
    const now = Date.now()

    // Log event with mobile user agent
    db.prepare(`
      INSERT INTO events (type, user_id, path, session_id, user_agent, referrer, meta_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'page_view',
      user.id,
      '/challenge',
      'sess_mobile',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      '',
      '{}',
      now,
    )

    const sessions = eventLogger.listSessions(24 * 60 * 60 * 1000)
    expect(sessions).toHaveLength(1)

    const sessionRow = sessions.map((s) => {
      const device = /Mobile|Android|iPhone|iPad/i.test(s.userAgent) ? 'Móvil' : 'Escritorio'
      return {
        sessionId: s.sessionId,
        device,
      }
    })[0]

    expect(sessionRow.device).toBe('Móvil')
  })

  it('returns empty arrays when no sessions exist', () => {
    const sessions = eventLogger.listSessions(24 * 60 * 60 * 1000)

    const avgDurationMs = sessions.length
      ? Math.round(sessions.reduce((acc, s) => acc + s.durationMs, 0) / sessions.length)
      : 0
    const bounceSessions = sessions.filter((s) => s.eventCount === 1).length
    const bounceRate = sessions.length ? Math.round((bounceSessions / sessions.length) * 100) : 0

    expect(sessions).toHaveLength(0)
    expect(avgDurationMs).toBe(0)
    expect(bounceRate).toBe(0)
  })

  it('excludes sessions outside the time window', () => {
    const user = userRepo.findOrCreateByUsername('student1')
    const now = Date.now()
    const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    // Event from 2 days ago
    db.prepare(`
      INSERT INTO events (type, user_id, path, session_id, user_agent, referrer, meta_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('page_view', user.id, '/old', 'sess_old', 'Mozilla/5.0', '', '{}', twoDaysAgo)

    // Event from within the 24-hour window
    db.prepare(`
      INSERT INTO events (type, user_id, path, session_id, user_agent, referrer, meta_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('page_view', user.id, '/recent', 'sess_recent', 'Mozilla/5.0', '', '{}', oneDayAgo + 1000)

    const sessions = eventLogger.listSessions(24 * 60 * 60 * 1000)

    // Only the recent session should be included
    expect(sessions).toHaveLength(1)
    expect(sessions[0].sessionId).toBe('sess_recent')
  })
})
