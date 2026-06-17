import type { TestCase } from '../curriculum/types'
import { matchesExpected } from './validate'
import { computeStars } from './stars'

export interface GradeInput {
  producedOutputs: string[]
  testCases: TestCase[]
  attempts: number
  hintsUsed: number
}

export interface GradeResult {
  correct: boolean
  stars: number
}

export function gradeSubmission(input: GradeInput): GradeResult {
  const { producedOutputs, testCases, attempts, hintsUsed } = input
  const correct =
    producedOutputs.length === testCases.length &&
    testCases.every((tc, i) => matchesExpected(producedOutputs[i] ?? '', tc.expectedOutput))
  const stars = computeStars({ correct, attempts, hintsUsed })
  return { correct, stars }
}
