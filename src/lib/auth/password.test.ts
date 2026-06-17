import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('password', () => {
  it('verifica un hash correcto', () => {
    const h = hashPassword('secreta')
    expect(verifyPassword('secreta', h)).toBe(true)
  })
  it('rechaza una contraseña incorrecta', () => {
    const h = hashPassword('secreta')
    expect(verifyPassword('otra', h)).toBe(false)
  })
  it('coincide con el hash sembrado del root (sha256 de changeme)', () => {
    // seedRoot usa createHash('sha256').update('changeme').digest('hex')
    expect(verifyPassword('changeme', '057ba03d6c44104863dc7361fe4578965d1887360f90a0895882e58a6248fc86')).toBe(true)
  })
})
