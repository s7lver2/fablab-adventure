import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../../../../lib/db/schema'
import { UserRepository } from '../../../../lib/users/repository'
import { EventLogger } from '../../../../lib/analytics/events'

describe('Audit API (GET /api/admin/audit)', () => {
  let db: Database.Database
  let userRepo: UserRepository
  let eventLogger: EventLogger

  beforeEach(() => {
    db = new Database(':memory:')
    createSchema(db)
    userRepo = new UserRepository(db)
    eventLogger = new EventLogger(db)
  })

  it('returns empty array when no admin events exist', () => {
    const adminTypes = [
      'admin:appeal_accept', 'admin:appeal_reject',
      'admin:user_create', 'admin:role_change',
      'admin:maintenance_on', 'admin:maintenance_off',
    ]

    const events = eventLogger.listByTypes(adminTypes)
    expect(events).toHaveLength(0)
  })

  it('filters and returns only admin event types', () => {
    const admin = userRepo.findOrCreateByUsername('admin1')
    userRepo.setRole(admin.id, 'admin')

    // Log various admin events
    eventLogger.log({ type: 'admin:user_create', userId: admin.id, meta: { username: 'newuser' } })
    eventLogger.log({ type: 'admin:role_change', userId: admin.id, meta: { targetId: 2, newRole: 'mentor' } })
    eventLogger.log({ type: 'admin:maintenance_on', userId: admin.id, meta: {} })

    // Log non-admin events that should be filtered out
    eventLogger.log({ type: 'page_view', userId: admin.id, meta: {} })
    eventLogger.log({ type: 'lesson_complete', userId: admin.id, meta: {} })

    const adminTypes = [
      'admin:appeal_accept', 'admin:appeal_reject',
      'admin:user_create', 'admin:role_change',
      'admin:maintenance_on', 'admin:maintenance_off',
    ]

    const events = eventLogger.listByTypes(adminTypes)

    expect(events).toHaveLength(3)
    expect(events.every((e) => adminTypes.includes(e.type))).toBe(true)
  })

  it('returns events in descending chronological order (newest first)', () => {
    const admin = userRepo.findOrCreateByUsername('admin1')
    userRepo.setRole(admin.id, 'admin')

    const now = Date.now()

    // Insert events at different times
    db.prepare(`
      INSERT INTO events (type, user_id, path, session_id, user_agent, referrer, meta_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('admin:user_create', admin.id, '', '', '', '', '{"username":"user1"}', now - 3000)

    db.prepare(`
      INSERT INTO events (type, user_id, path, session_id, user_agent, referrer, meta_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('admin:user_create', admin.id, '', '', '', '', '{"username":"user2"}', now - 1000)

    db.prepare(`
      INSERT INTO events (type, user_id, path, session_id, user_agent, referrer, meta_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('admin:user_create', admin.id, '', '', '', '', '{"username":"user3"}', now - 2000)

    const adminTypes = ['admin:user_create']
    const events = eventLogger.listByTypes(adminTypes)

    expect(events).toHaveLength(3)
    // Should be ordered by created_at DESC (newest first)
    expect(events[0].meta.username).toBe('user2') // now - 1000
    expect(events[1].meta.username).toBe('user3') // now - 2000
    expect(events[2].meta.username).toBe('user1') // now - 3000
  })

  it('handles null userId gracefully', () => {
    const now = Date.now()

    // Log event with null userId
    db.prepare(`
      INSERT INTO events (type, user_id, path, session_id, user_agent, referrer, meta_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('admin:user_create', null, '', '', '', '', '{"username":"user"}', now)

    const adminTypes = ['admin:user_create']
    const events = eventLogger.listByTypes(adminTypes)

    expect(events).toHaveLength(1)
    expect(events[0].userId).toBeNull()
  })

  it('preserves metadata correctly', () => {
    const admin = userRepo.findOrCreateByUsername('admin1')
    userRepo.setRole(admin.id, 'admin')

    const metadata = { username: 'newuser', email: 'test@example.com', customField: 123 }
    eventLogger.log({ type: 'admin:user_create', userId: admin.id, meta: metadata })

    const adminTypes = ['admin:user_create']
    const events = eventLogger.listByTypes(adminTypes)

    expect(events).toHaveLength(1)
    expect(events[0].meta).toEqual(metadata)
  })

  it('handles role_change events with multiple fields', () => {
    const admin = userRepo.findOrCreateByUsername('admin1')
    userRepo.setRole(admin.id, 'admin')

    const metadata = { targetId: 42, newRole: 'mentor', previousRole: 'student' }
    eventLogger.log({ type: 'admin:role_change', userId: admin.id, meta: metadata })

    const adminTypes = ['admin:role_change']
    const events = eventLogger.listByTypes(adminTypes)

    expect(events).toHaveLength(1)
    expect(events[0].meta.targetId).toBe(42)
    expect(events[0].meta.newRole).toBe('mentor')
  })

  it('returns limited results when there are more than 100 events', () => {
    const admin = userRepo.findOrCreateByUsername('admin1')
    userRepo.setRole(admin.id, 'admin')

    // Create 150 admin events
    for (let i = 0; i < 150; i++) {
      eventLogger.log({ type: 'admin:user_create', userId: admin.id, meta: { username: `user${i}` } })
    }

    const adminTypes = ['admin:user_create']
    const events = eventLogger.listByTypes(adminTypes)

    expect(events.length).toBe(150)

    // When sliced to 100 (as done in the route), should return 100
    const limited = events.slice(0, 100)
    expect(limited).toHaveLength(100)
  })

  it('transforms events to AuditEntry format correctly', () => {
    const admin = userRepo.findOrCreateByUsername('admin1')
    userRepo.setRole(admin.id, 'admin')

    eventLogger.log({ type: 'admin:user_create', userId: admin.id, meta: { username: 'newuser' } })

    const adminTypes = ['admin:user_create']
    const events = eventLogger.listByTypes(adminTypes)

    const entries = events.slice(0, 100).map((e) => {
      const adminUser = e.userId != null ? userRepo.findById(e.userId) : null
      return {
        id: e.id,
        timestamp: e.createdAt,
        adminUsername: adminUser?.username ?? '?',
        type: e.type,
        meta: e.meta,
      }
    })

    expect(entries).toHaveLength(1)
    const entry = entries[0]
    expect(entry.id).toBeDefined()
    expect(entry.timestamp).toBeGreaterThan(0)
    expect(entry.adminUsername).toBe('admin1')
    expect(entry.type).toBe('admin:user_create')
    expect(entry.meta).toEqual({ username: 'newuser' })
  })

  it('handles events with missing admin user (returns ? for username)', () => {
    const now = Date.now()

    // Log event with non-existent userId
    db.prepare(`
      INSERT INTO events (type, user_id, path, session_id, user_agent, referrer, meta_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('admin:user_create', 99999, '', '', '', '', '{"username":"user"}', now)

    const adminTypes = ['admin:user_create']
    const events = eventLogger.listByTypes(adminTypes)

    const entries = events.slice(0, 100).map((e) => {
      const adminUser = e.userId != null ? userRepo.findById(e.userId) : null
      return {
        id: e.id,
        timestamp: e.createdAt,
        adminUsername: adminUser?.username ?? '?',
        type: e.type,
        meta: e.meta,
      }
    })

    expect(entries).toHaveLength(1)
    expect(entries[0].adminUsername).toBe('?')
  })
})

describe('User creation and role change logging', () => {
  let db: Database.Database
  let userRepo: UserRepository
  let eventLogger: EventLogger

  beforeEach(() => {
    db = new Database(':memory:')
    createSchema(db)
    userRepo = new UserRepository(db)
    eventLogger = new EventLogger(db)
  })

  it('logs admin:user_create events with username metadata', () => {
    const admin = userRepo.findOrCreateByUsername('admin1')
    userRepo.setRole(admin.id, 'admin')

    // Simulate admin user creation with logging
    const newUser = userRepo.createAdmin('newuser', 'New User', 'password123')
    eventLogger.log({ type: 'admin:user_create', userId: admin.id, meta: { username: 'newuser' } })

    const events = eventLogger.listByTypes(['admin:user_create'])
    expect(events).toHaveLength(1)
    expect(events[0].userId).toBe(admin.id)
    expect(events[0].meta.username).toBe('newuser')
  })

  it('logs admin:role_change events with targetId and newRole metadata', () => {
    const admin = userRepo.findOrCreateByUsername('admin1')
    userRepo.setRole(admin.id, 'admin')

    const targetUser = userRepo.findOrCreateByUsername('student1')

    // Simulate role change with logging
    userRepo.setRole(targetUser.id, 'mentor')
    eventLogger.log({
      type: 'admin:role_change',
      userId: admin.id,
      meta: { targetId: targetUser.id, newRole: 'mentor' },
    })

    const events = eventLogger.listByTypes(['admin:role_change'])
    expect(events).toHaveLength(1)
    expect(events[0].userId).toBe(admin.id)
    expect(events[0].meta.targetId).toBe(targetUser.id)
    expect(events[0].meta.newRole).toBe('mentor')
  })

  it('tracks multiple admin actions sequentially', () => {
    const admin = userRepo.findOrCreateByUsername('admin1')
    userRepo.setRole(admin.id, 'admin')

    // Simulate multiple admin actions
    userRepo.createAdmin('user1', 'User 1', 'pass')
    eventLogger.log({ type: 'admin:user_create', userId: admin.id, meta: { username: 'user1' } })

    userRepo.createAdmin('user2', 'User 2', 'pass')
    eventLogger.log({ type: 'admin:user_create', userId: admin.id, meta: { username: 'user2' } })

    const user3 = userRepo.findOrCreateByUsername('user3')
    userRepo.setRole(user3.id, 'mentor')
    eventLogger.log({
      type: 'admin:role_change',
      userId: admin.id,
      meta: { targetId: user3.id, newRole: 'mentor' },
    })

    const adminTypes = ['admin:user_create', 'admin:role_change']
    const events = eventLogger.listByTypes(adminTypes)

    expect(events).toHaveLength(3)
    expect(events.filter((e) => e.type === 'admin:user_create')).toHaveLength(2)
    expect(events.filter((e) => e.type === 'admin:role_change')).toHaveLength(1)
  })
})
