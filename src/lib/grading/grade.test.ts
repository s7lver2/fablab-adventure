import { describe, it, expect } from 'vitest'
import { gradeSubmission } from './grade'
import type { TestCase } from '../curriculum/types'

const cases: TestCase[] = [{ input: { hasta: 3 }, expectedOutput: 'Hola 1\nHola 2\nHola 3' }]

describe('gradeSubmission', () => {
  it('aprueba con la salida correcta y calcula estrellas', () => {
    const r = gradeSubmission({
      producedOutputs: ['Hola 1\nHola 2\nHola 3'],
      testCases: cases,
      attempts: 1,
      hintsUsed: 0,
    })
    expect(r.correct).toBe(true)
    expect(r.stars).toBe(3)
  })
  it('suspende si alguna salida no coincide', () => {
    const r = gradeSubmission({
      producedOutputs: ['Hola 1\nHola 2'],
      testCases: cases,
      attempts: 1,
      hintsUsed: 0,
    })
    expect(r.correct).toBe(false)
    expect(r.stars).toBe(0)
  })
})
