import { describe, it, expect } from 'vitest'
import { validateProfileUpdate } from './profile'

describe('validateProfileUpdate', () => {
  it('acepta un mensaje de 100 caracteres', () => {
    const msg = 'a'.repeat(100)
    const r = validateProfileUpdate({ displayName: 'Ana', avatar: '', profileMessage: msg })
    expect(r.ok).toBe(true)
  })

  it('rechaza un mensaje de 101 caracteres', () => {
    const msg = 'a'.repeat(101)
    const r = validateProfileUpdate({ displayName: 'Ana', avatar: '', profileMessage: msg })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/100/)
  })

  it('rechaza un nombre vacío', () => {
    const r = validateProfileUpdate({ displayName: '   ', avatar: '', profileMessage: '' })
    expect(r.ok).toBe(false)
  })
})
