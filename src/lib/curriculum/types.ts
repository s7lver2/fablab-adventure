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

export interface FullChallenge extends ChallengeSummary {
  narrative: string
  variants: Partial<Record<Language, ChallengeVariant>>
  testCases: TestCase[]
}
