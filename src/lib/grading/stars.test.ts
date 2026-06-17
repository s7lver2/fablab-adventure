import { describe, it, expect } from 'vitest'
import { computeStars } from './stars'

describe('computeStars', () => {
  it('da 0 estrellas si la salida es incorrecta', () => {
    expect(computeStars({ correct: false, attempts: 1, hintsUsed: 0 })).toBe(0)
  })
  it('da 3 estrellas a la primera sin pistas', () => {
    expect(computeStars({ correct: true, attempts: 1, hintsUsed: 0 })).toBe(3)
  })
  it('da 2 estrellas con varios intentos o alguna pista', () => {
    expect(computeStars({ correct: true, attempts: 3, hintsUsed: 0 })).toBe(2)
    expect(computeStars({ correct: true, attempts: 1, hintsUsed: 1 })).toBe(2)
  })
  it('da 1 estrella si costó mucho', () => {
    expect(computeStars({ correct: true, attempts: 8, hintsUsed: 3 })).toBe(1)
  })
})
