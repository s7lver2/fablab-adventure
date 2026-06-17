import { describe, it, expect } from 'vitest'
import { normalize, matchesExpected } from './validate'

describe('normalize', () => {
  it('recorta espacios al final de cada línea y del texto', () => {
    expect(normalize('Hola 1  \nHola 2\n\n')).toBe('Hola 1\nHola 2')
  })
})

describe('matchesExpected', () => {
  it('acepta salida correcta ignorando espacios finales', () => {
    expect(matchesExpected('5050  ', '5050')).toBe(true)
  })
  it('rechaza salida incorrecta', () => {
    expect(matchesExpected('5051', '5050')).toBe(false)
  })
})
