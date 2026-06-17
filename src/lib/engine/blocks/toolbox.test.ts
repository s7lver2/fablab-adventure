import { describe, it, expect } from 'vitest'
import { TOOLBOX } from './toolbox'

describe('toolbox de bloques', () => {
  it('incluye categorías básicas para principiantes', () => {
    const labels = TOOLBOX.contents.map((c) => c.name)
    expect(labels).toEqual(expect.arrayContaining(['Imprimir', 'Bucles', 'Variables', 'Matemáticas']))
  })
})
