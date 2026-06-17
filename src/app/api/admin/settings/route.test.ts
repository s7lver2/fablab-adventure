import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, PATCH } from './route'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { SettingsRepository } from '@/lib/settings/repository'
import { EventLogger } from '@/lib/analytics/events'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'

vi.mock('@/lib/db/connection')
vi.mock('@/lib/users/repository')
vi.mock('@/lib/settings/repository')
vi.mock('@/lib/analytics/events')
vi.mock('@/lib/session/server')
vi.mock('@/lib/auth/guard')

describe('GET /api/admin/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 403 when user is not admin', async () => {
    const mockUser = { id: 'user1', isAdmin: false }
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as any)
    vi.mocked(isAdmin).mockReturnValue(false)

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json.error).toBe('No autorizado.')
  })

  it('returns settings when user is admin', async () => {
    const mockUser = { id: 'admin1', isAdmin: true }
    const mockDb = {} as any
    const mockSettings = {
      getBool: vi.fn().mockReturnValue(true),
      get: vi.fn().mockReturnValue('1.2.3'),
      getNumber: vi.fn().mockReturnValue(5),
    }

    vi.mocked(getDb).mockReturnValue(mockDb)
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser)
    vi.mocked(isAdmin).mockReturnValue(true)
    vi.mocked(SettingsRepository).mockImplementation(() => mockSettings as any)

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({
      maintenance: true,
      seedVersion: '1.2.3',
      appeals: {
        maxPendingPerChallenge: 5,
        maxPendingGlobal: 5,
        cooldownHours: 5,
      },
    })
  })

  it('uses default value for missing seed_version', async () => {
    const mockUser = { id: 'admin1', isAdmin: true }
    const mockDb = {} as any
    const mockSettings = {
      getBool: vi.fn().mockReturnValue(false),
      get: vi.fn().mockReturnValue(null),
      getNumber: vi.fn().mockReturnValue(3),
    }

    vi.mocked(getDb).mockReturnValue(mockDb)
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser)
    vi.mocked(isAdmin).mockReturnValue(true)
    vi.mocked(SettingsRepository).mockImplementation(() => mockSettings as any)

    const response = await GET()
    const json = await response.json()

    expect(json.seedVersion).toBe('—')
  })
})

describe('PATCH /api/admin/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 403 when user is not admin', async () => {
    const mockUser = { id: 'user1', isAdmin: false }
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as any)
    vi.mocked(isAdmin).mockReturnValue(false)

    const request = new Request('http://localhost/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({ maintenance: true }),
    })

    const response = await PATCH(request)
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json.error).toBe('No autorizado.')
  })

  it('toggles maintenance mode and logs event', async () => {
    const mockUser = { id: 'admin1', isAdmin: true }
    const mockDb = {} as any
    const mockSettings = {
      set: vi.fn(),
      getBool: vi.fn().mockReturnValue(false),
      get: vi.fn().mockReturnValue('1.0.0'),
      getNumber: vi.fn().mockReturnValue(1),
    }
    const mockLogger = {
      log: vi.fn(),
    }

    vi.mocked(getDb).mockReturnValue(mockDb)
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser)
    vi.mocked(isAdmin).mockReturnValue(true)
    vi.mocked(SettingsRepository).mockImplementation(() => mockSettings as any)
    vi.mocked(EventLogger).mockImplementation(() => mockLogger as any)

    const request = new Request('http://localhost/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({ maintenance: true }),
    })

    const response = await PATCH(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(mockSettings.set).toHaveBeenCalledWith('maintenance.enabled', 'true')
    expect(mockLogger.log).toHaveBeenCalledWith({
      type: 'admin:maintenance_on',
      userId: 'admin1',
    })
  })

  it('logs admin:maintenance_off event when toggling off', async () => {
    const mockUser = { id: 'admin1', isAdmin: true }
    const mockDb = {} as any
    const mockSettings = {
      set: vi.fn(),
      getBool: vi.fn().mockReturnValue(true),
      get: vi.fn().mockReturnValue('1.0.0'),
      getNumber: vi.fn().mockReturnValue(1),
    }
    const mockLogger = {
      log: vi.fn(),
    }

    vi.mocked(getDb).mockReturnValue(mockDb)
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser)
    vi.mocked(isAdmin).mockReturnValue(true)
    vi.mocked(SettingsRepository).mockImplementation(() => mockSettings as any)
    vi.mocked(EventLogger).mockImplementation(() => mockLogger as any)

    const request = new Request('http://localhost/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({ maintenance: false }),
    })

    const response = await PATCH(request)

    expect(mockLogger.log).toHaveBeenCalledWith({
      type: 'admin:maintenance_off',
      userId: 'admin1',
    })
  })

  it('handles request without maintenance field gracefully', async () => {
    const mockUser = { id: 'admin1', isAdmin: true }
    const mockDb = {} as any
    const mockSettings = {
      set: vi.fn(),
      getBool: vi.fn().mockReturnValue(false),
      get: vi.fn().mockReturnValue('1.0.0'),
      getNumber: vi.fn().mockReturnValue(1),
    }
    const mockLogger = {
      log: vi.fn(),
    }

    vi.mocked(getDb).mockReturnValue(mockDb)
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser)
    vi.mocked(isAdmin).mockReturnValue(true)
    vi.mocked(SettingsRepository).mockImplementation(() => mockSettings as any)
    vi.mocked(EventLogger).mockImplementation(() => mockLogger as any)

    const request = new Request('http://localhost/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({}),
    })

    const response = await PATCH(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(mockSettings.set).not.toHaveBeenCalled()
    expect(mockLogger.log).not.toHaveBeenCalled()
  })
})
