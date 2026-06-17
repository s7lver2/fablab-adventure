import { describe, it, expect } from 'vitest'
import { canCreateAppeal } from './limits'

const limits = { maxPendingPerChallenge: 1, maxPendingGlobal: 3, cooldownHours: 24 }
const NOW = 1_000_000_000_000

describe('canCreateAppeal', () => {
  it('permite cuando no hay nada pendiente ni rechazos recientes', () => {
    const r = canCreateAppeal(
      { pendingForChallenge: 0, pendingGlobal: 0, lastRejectedAt: null },
      limits,
      NOW,
    )
    expect(r.allowed).toBe(true)
  })

  it('rechaza si ya hay una pendiente para ese reto', () => {
    const r = canCreateAppeal(
      { pendingForChallenge: 1, pendingGlobal: 1, lastRejectedAt: null },
      limits,
      NOW,
    )
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/pendiente/i)
  })

  it('rechaza si se alcanzó el máximo global de pendientes', () => {
    const r = canCreateAppeal(
      { pendingForChallenge: 0, pendingGlobal: 3, lastRejectedAt: null },
      limits,
      NOW,
    )
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/3/)
  })

  it('rechaza dentro del cooldown tras un rechazo', () => {
    const r = canCreateAppeal(
      { pendingForChallenge: 0, pendingGlobal: 0, lastRejectedAt: NOW - 1000 * 60 * 60 * 5 }, // hace 5 h
      limits,
      NOW,
    )
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/horas|esperar/i)
  })

  it('permite pasado el cooldown', () => {
    const r = canCreateAppeal(
      { pendingForChallenge: 0, pendingGlobal: 0, lastRejectedAt: NOW - 1000 * 60 * 60 * 25 }, // hace 25 h
      limits,
      NOW,
    )
    expect(r.allowed).toBe(true)
  })
})
