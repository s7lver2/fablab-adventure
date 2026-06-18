import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '@/lib/db/schema'
import { UserRepository } from '@/lib/users/repository'
import { SettingsRepository } from '@/lib/settings/repository'
import { EventLogger } from '@/lib/analytics/events'

describe('Settings Repository Integration', () => {
  let db: Database.Database
  let userRepo: UserRepository
  let settingsRepo: SettingsRepository
  let eventLogger: EventLogger

  beforeEach(() => {
    db = new Database(':memory:')
    createSchema(db)
    userRepo = new UserRepository(db)
    settingsRepo = new SettingsRepository(db)
    eventLogger = new EventLogger(db)
  })

  it('retrieves maintenance status', () => {
    settingsRepo.set('maintenance.enabled', 'true')
    expect(settingsRepo.getBool('maintenance.enabled')).toBe(true)
  })

  it('defaults maintenance to disabled', () => {
    expect(settingsRepo.getBool('maintenance.enabled')).toBe(false)
  })

  it('returns seed version', () => {
    settingsRepo.set('seed_version', '1.2.3')
    expect(settingsRepo.get('seed_version')).toBe('1.2.3')
  })

  it('defaults seed version to empty', () => {
    const val = settingsRepo.get('seed_version')
    expect(val === '' || val === '—').toBe(true)
  })

  it('returns appeal limits', () => {
    expect(settingsRepo.getNumber('appeals.maxPendingPerChallenge')).toBe(1)
    expect(settingsRepo.getNumber('appeals.maxPendingGlobal')).toBe(3)
    expect(settingsRepo.getNumber('appeals.cooldownHours')).toBe(24)
  })

  it('logs maintenance toggle events', () => {
    const admin = userRepo.findOrCreateByUsername('admin1')
    userRepo.setRole(admin.id, 'admin')

    settingsRepo.set('maintenance.enabled', 'true')
    eventLogger.log({ type: 'admin:maintenance_on', userId: admin.id, meta: {} })

    const events = eventLogger.listAll()
    expect(events.some((e) => e.type === 'admin:maintenance_on' && e.userId === admin.id)).toBe(true)
  })

  it('logs maintenance off events', () => {
    const admin = userRepo.findOrCreateByUsername('admin1')
    userRepo.setRole(admin.id, 'admin')

    settingsRepo.set('maintenance.enabled', 'false')
    eventLogger.log({ type: 'admin:maintenance_off', userId: admin.id, meta: {} })

    const events = eventLogger.listAll()
    expect(events.some((e) => e.type === 'admin:maintenance_off' && e.userId === admin.id)).toBe(true)
  })
})
