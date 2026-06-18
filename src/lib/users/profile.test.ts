import { describe, it, expect } from 'vitest'
import { validateProfileUpdate } from './profile'

describe('validateProfileUpdate', () => {
  const validBase = {
    displayName: 'Ana',
    avatar: '',
    profileMessage: '',
    banner: '',
    bannerImage: null,
  }

  it('acepta un mensaje de 100 caracteres', () => {
    const msg = 'a'.repeat(100)
    const r = validateProfileUpdate({ ...validBase, profileMessage: msg })
    expect(r.ok).toBe(true)
  })

  it('rechaza un mensaje de 101 caracteres', () => {
    const msg = 'a'.repeat(101)
    const r = validateProfileUpdate({ ...validBase, profileMessage: msg })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/100/)
  })

  it('rechaza un nombre vacío', () => {
    const r = validateProfileUpdate({ ...validBase, displayName: '   ' })
    expect(r.ok).toBe(false)
  })

  it('acepta banner vacío', () => {
    const r = validateProfileUpdate({ ...validBase, banner: '' })
    expect(r.ok).toBe(true)
  })

  it('acepta banner "upload"', () => {
    const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const r = validateProfileUpdate({ ...validBase, banner: 'upload', bannerImage: base64Image })
    expect(r.ok).toBe(true)
  })

  it('acepta banner "preset:sunset"', () => {
    const r = validateProfileUpdate({ ...validBase, banner: 'preset:sunset' })
    expect(r.ok).toBe(true)
  })

  it('acepta banner "preset:ocean"', () => {
    const r = validateProfileUpdate({ ...validBase, banner: 'preset:ocean' })
    expect(r.ok).toBe(true)
  })

  it('rechaza banner preset ID inválido', () => {
    const r = validateProfileUpdate({ ...validBase, banner: 'preset:invalid' })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/preset/)
  })

  it('rechaza banner token inválido', () => {
    const r = validateProfileUpdate({ ...validBase, banner: 'custom' })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/inválido/)
  })

  it('rechaza banner "upload" sin imagen', () => {
    const r = validateProfileUpdate({ ...validBase, banner: 'upload', bannerImage: null })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/imagen/)
  })

  it('rechaza imagen sin formato base64 válido', () => {
    const r = validateProfileUpdate({ ...validBase, banner: 'upload', bannerImage: 'not-base64' })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/base64/)
  })

  it('rechaza imagen con tipo no soportado', () => {
    const r = validateProfileUpdate({ ...validBase, banner: 'upload', bannerImage: 'data:image/bmp;base64,xyz' })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/PNG|JPEG|WebP|GIF/)
  })

  it('rechaza imagen muy grande', () => {
    const largeBase64 = 'data:image/png;base64,' + 'a'.repeat(700_001)
    const r = validateProfileUpdate({ ...validBase, banner: 'upload', bannerImage: largeBase64 })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/700_000|caracteres/)
  })
})
