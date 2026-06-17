import { describe, it, expect } from 'vitest'
import { summarize } from './aggregate'
import type { EventRecord } from './events'

const HOUR = 1000 * 60 * 60
function ev(p: Partial<EventRecord>): EventRecord {
  return {
    id: 0, type: 'open_challenge', userId: 1, path: '/', sessionId: 's', userAgent: '',
    referrer: '', meta: {}, createdAt: 0, ...p,
  }
}

describe('summarize', () => {
  it('cuenta eventos, sesiones y usuarios activos', () => {
    const events = [
      ev({ sessionId: 's1', userId: 1, createdAt: 0 }),
      ev({ sessionId: 's1', userId: 1, createdAt: HOUR }),
      ev({ sessionId: 's2', userId: 2, createdAt: 0 }),
    ]
    const s = summarize(events)
    expect(s.totalEvents).toBe(3)
    expect(s.sessions).toBe(2)
    expect(s.activeUsers).toBe(2)
  })

  it('calcula rebote (sesiones con un solo evento)', () => {
    const events = [
      ev({ sessionId: 's1', createdAt: 0 }),
      ev({ sessionId: 's1', createdAt: HOUR }),
      ev({ sessionId: 's2', createdAt: 0 }), // rebote
    ]
    const s = summarize(events)
    expect(s.bounceSessions).toBe(1)
  })

  it('duración media de sesión = media de (último-primer evento)', () => {
    const events = [
      ev({ sessionId: 's1', createdAt: 0 }),
      ev({ sessionId: 's1', createdAt: 2 * HOUR }), // dura 2h
      ev({ sessionId: 's2', createdAt: 0 }),        // dura 0
    ]
    const s = summarize(events)
    expect(s.avgSessionMs).toBe(HOUR) // media de 2h y 0 = 1h
  })

  it('agrupa actividad por hora del día (0-23)', () => {
    const s = summarize([ev({ createdAt: 0 })]) // epoch = 00:00 UTC
    expect(s.byHour).toHaveLength(24)
    expect(s.byHour.reduce((a, b) => a + b, 0)).toBe(1)
  })
})
