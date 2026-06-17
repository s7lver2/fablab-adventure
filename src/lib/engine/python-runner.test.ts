import { describe, it, expect } from 'vitest'
import { runPython } from './python-runner'

describe('runPython', () => {
  it('ejecuta print básico', () => {
    const result = runPython('print("Hola mundo")', null)
    expect(result.error).toBeUndefined()
    expect(result.output).toBe('Hola mundo')
  })

  it('accede a input como variable global', () => {
    const result = runPython('print(input["hasta"])', { hasta: 5 })
    expect(result.output).toBe('5')
  })

  it('bucle for range', () => {
    const result = runPython('for i in range(1, 4):\n    print(f"Hola {i}")', null)
    expect(result.output).toBe('Hola 1\nHola 2\nHola 3')
  })

  it('devuelve error en syntax error', () => {
    const result = runPython('def (', null)
    expect(result.error).toBeTruthy()
    expect(result.output).toBe('')
  })
})
