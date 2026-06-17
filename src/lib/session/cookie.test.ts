import { describe, it, expect } from 'vitest'
import { signSession, verifySession } from './cookie'

const SECRET = 'test-secret-1234'

describe('cookie de sesión', () => {
  it('firma y verifica el id de usuario', () => {
    const token = signSession({ userId: 42 }, SECRET)
    const payload = verifySession(token, SECRET)
    expect(payload?.userId).toBe(42)
  })

  it('rechaza un token manipulado', () => {
    const token = signSession({ userId: 42 }, SECRET)
    const tampered = token.slice(0, -2) + (token.endsWith('a') ? 'bb' : 'aa')
    expect(verifySession(tampered, SECRET)).toBeNull()
  })

  it('rechaza un token firmado con otro secreto', () => {
    const token = signSession({ userId: 42 }, SECRET)
    expect(verifySession(token, 'otro-secreto')).toBeNull()
  })
})
