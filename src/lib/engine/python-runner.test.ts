import { describe, it, expect } from 'vitest'
import { runPython } from './python-runner'

describe('runPython', () => {
  it('devuelve error cuando Skulpt no está disponible', () => {
    const result = runPython('print("Hola mundo")', null)
    // En tests sin Skulpt global, debería dar error
    expect(result.error).toBeTruthy()
  })
})
