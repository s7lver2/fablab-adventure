import type Database from 'better-sqlite3'
import type { ChallengeSummary, ChallengeVariant, ConceptWithChallenges, FullChallenge, Language, TestCase } from './types'

export class CurriculumRepository {
  constructor(private db: Database.Database) {}

  listChallenges(): ChallengeSummary[] {
    return this.db
      .prepare('SELECT id, slug, title, ord FROM challenges ORDER BY ord ASC, id ASC')
      .all() as ChallengeSummary[]
  }

  getChallengeBySlug(slug: string): FullChallenge | null {
    const row = this.db
      .prepare('SELECT id, slug, title, ord, narrative FROM challenges WHERE slug = ?')
      .get(slug) as (ChallengeSummary & { narrative: string }) | undefined
    if (!row) return null

    const variantRows = this.db
      .prepare('SELECT language, statement, starter_code, hints_json FROM challenge_variants WHERE challenge_id = ?')
      .all(row.id) as { language: Language; statement: string; starter_code: string; hints_json: string }[]

    const variants: Partial<Record<Language, ChallengeVariant>> = {}
    for (const v of variantRows) {
      variants[v.language] = {
        statement: v.statement,
        starterCode: v.starter_code,
        hints: JSON.parse(v.hints_json),
      }
    }

    const testRows = this.db
      .prepare('SELECT input_json, expected_output FROM test_cases WHERE challenge_id = ? ORDER BY ord ASC, id ASC')
      .all(row.id) as { input_json: string; expected_output: string }[]
    const testCases: TestCase[] = testRows.map((t) => ({
      input: JSON.parse(t.input_json),
      expectedOutput: t.expected_output,
    }))

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      ord: row.ord,
      narrative: row.narrative,
      variants,
      testCases,
    }
  }

  listConceptsWithChallenges(): ConceptWithChallenges[] {
    const concepts = this.db
      .prepare('SELECT id, slug, name, description, ord FROM concepts ORDER BY ord ASC')
      .all() as { id: number; slug: string; name: string; description: string; ord: number }[]

    return concepts.map((c) => ({
      ...c,
      challenges: this.db
        .prepare('SELECT id, slug, title, ord FROM challenges WHERE concept_id = ? ORDER BY ord ASC, id ASC')
        .all(c.id) as ChallengeSummary[],
    }))
  }
}
