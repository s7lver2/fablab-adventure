import { describe, it, expect } from 'vitest'
import { shouldBlockForMaintenance } from './maintenance'

describe('shouldBlockForMaintenance', () => {
  it('no bloquea si mantenimiento está apagado', () => {
    expect(shouldBlockForMaintenance({ enabled: false, isAdmin: false, path: '/' })).toBe(false)
  })
  it('bloquea a usuarios normales cuando está encendido', () => {
    expect(shouldBlockForMaintenance({ enabled: true, isAdmin: false, path: '/' })).toBe(true)
  })
  it('nunca bloquea a admins', () => {
    expect(shouldBlockForMaintenance({ enabled: true, isAdmin: true, path: '/' })).toBe(false)
  })
  it('nunca bloquea rutas de admin ni la propia página de mantenimiento', () => {
    expect(shouldBlockForMaintenance({ enabled: true, isAdmin: false, path: '/admin/login' })).toBe(false)
    expect(shouldBlockForMaintenance({ enabled: true, isAdmin: false, path: '/maintenance' })).toBe(false)
  })
})
