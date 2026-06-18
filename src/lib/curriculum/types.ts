export type Language = 'blocks' | 'js' | 'python'

export interface ChallengeSummary {
  id: number
  slug: string
  title: string
  ord: number
}

export interface ChallengeVariant {
  statement: string
  starterCode: string
  hints: string[]
}

export interface TestCase {
  input: unknown
  expectedOutput: string
}

export interface ChallengePart {
  id: number
  ord: number
  variants: Partial<Record<Language, ChallengeVariant>>
  testCases: TestCase[]
}

export interface FullChallenge extends ChallengeSummary {
  narrative: string
  variants: Partial<Record<Language, ChallengeVariant>>
  testCases: TestCase[]
  parts: ChallengePart[]
}

export interface ConceptWithChallenges {
  id: number
  slug: string
  name: string
  description: string
  ord: number
  challenges: ChallengeSummary[]
}
