import { describe, it, expect } from 'vitest'
import { parseUserAgent } from './user-agent'

describe('parseUserAgent', () => {
  it('detecta Chrome en Windows escritorio', () => {
    const r = parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537')
    expect(r.browser).toBe('Chrome')
    expect(r.os).toBe('Windows')
    expect(r.device).toBe('Escritorio')
  })
  it('detecta móvil Android', () => {
    const r = parseUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel) Chrome/120 Mobile Safari/537')
    expect(r.os).toBe('Android')
    expect(r.device).toBe('Móvil')
  })
  it('desconocido si está vacío', () => {
    const r = parseUserAgent('')
    expect(r.browser).toBe('Desconocido')
  })
})
