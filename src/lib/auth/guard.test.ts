import { describe, it, expect } from 'vitest'
import { isAdmin } from './guard'

describe('isAdmin', () => {
  it('acepta admin y root', () => {
    expect(isAdmin({ role: 'admin' })).toBe(true)
    expect(isAdmin({ role: 'root' })).toBe(true)
  })
  it('rechaza user y null', () => {
    expect(isAdmin({ role: 'user' })).toBe(false)
    expect(isAdmin(null)).toBe(false)
  })
})
