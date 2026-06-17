import type Database from 'better-sqlite3'

export interface ProgressRow {
  userId: number
  challengeId: number
  stars: number
  attempts: number
  hintsUsed: number
  status: 'in_progress' | 'completed'
  completedAt: number | null
}

export interface AttemptResult {
  stars: number
  hintsUsed: number
  completed: boolean
}

export class ProgressRepository {
  constructor(private db: Database.Database) {}

  get(userId: number, challengeId: number): ProgressRow | null {
    const row = this.db
      .prepare('SELECT * FROM progress WHERE user_id = ? AND challenge_id = ?')
      .get(userId, challengeId) as any
    if (!row) return null
    return {
      userId: row.user_id,
      challengeId: row.challenge_id,
      stars: row.stars,
      attempts: row.attempts,
      hintsUsed: row.hints_used,
      status: row.status,
      completedAt: row.completed_at,
    }
  }

  recordAttempt(userId: number, challengeId: number, result: AttemptResult): void {
    const existing = this.get(userId, challengeId)
    const now = Date.now()
    if (!existing) {
      this.db
        .prepare(
          `INSERT INTO progress (user_id, challenge_id, stars, attempts, hints_used, status, completed_at)
           VALUES (?, ?, ?, 1, ?, ?, ?)`,
        )
        .run(
          userId,
          challengeId,
          result.stars,
          result.hintsUsed,
          result.completed ? 'completed' : 'in_progress',
          result.completed ? now : null,
        )
      return
    }
    const newStars = Math.max(existing.stars, result.stars)
    const newStatus = existing.status === 'completed' || result.completed ? 'completed' : 'in_progress'
    const completedAt = existing.completedAt ?? (result.completed ? now : null)
    this.db
      .prepare(
        `UPDATE progress SET stars = ?, attempts = attempts + 1, hints_used = ?, status = ?, completed_at = ?
         WHERE user_id = ? AND challenge_id = ?`,
      )
      .run(newStars, result.hintsUsed, newStatus, completedAt, userId, challengeId)
  }

  completedChallengeIds(userId: number): number[] {
    const rows = this.db
      .prepare("SELECT challenge_id FROM progress WHERE user_id = ? AND status = 'completed'")
      .all(userId) as { challenge_id: number }[]
    return rows.map((r) => r.challenge_id)
  }
}
