import { describe, it, expect } from 'vitest'
import { runJs, friendlyError } from './js-runner'

describe('runJs', () => {
  it('captura lo que el programa imprime', () => {
    const res = runJs('for (let i = 1; i <= 3; i++) print("Hola " + i)', {})
    expect(res.error).toBeUndefined()
    expect(res.output).toBe('Hola 1\nHola 2\nHola 3')
  })

  it('expone la entrada al programa como variable input', () => {
    const res = runJs('print(input.n * 2)', { n: 21 })
    expect(res.output).toBe('42')
  })

  it('devuelve un error amable ante un fallo de sintaxis', () => {
    const res = runJs('for (', {})
    expect(res.error).toBeTruthy()
    expect(res.output).toBe('')
  })
})

describe('friendlyError', () => {
  it('traduce un paréntesis sin cerrar a lenguaje claro', () => {
    const msg = friendlyError(new SyntaxError('Unexpected end of input'))
    expect(msg).toMatch(/falta/i)
  })
})
