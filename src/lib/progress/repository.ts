import type Database from 'better-sqlite3'
import { computeStars, type StarInput } from '../grading/stars'

export interface Progress {
  userId: number
  challengeId: number
  stars: number
  attempts: number
  hintsUsed: number
  status: 'in_progress' | 'completed'
  completedAt: number | null
}

interface ProgressRow {
  user_id: number
  challenge_id: number
  stars: number
  attempts: number
  hints_used: number
  status: 'in_progress' | 'completed'
  completed_at: number | null
}

function toProgress(row: ProgressRow): Progress {
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

export class ProgressRepository {
  constructor(private db: Database.Database) {}

  recordAttempt(userId: number, challengeId: number, grading: StarInput): void {
    const now = Date.now()
    const newStars = computeStars(grading)
    const newStatus = grading.correct ? 'completed' : 'in_progress'
    const completedAt = grading.correct ? now : null

    // Get existing progress or initialize
    const existing = this.db
      .prepare('SELECT stars, attempts, hints_used FROM progress WHERE user_id = ? AND challenge_id = ?')
      .get(userId, challengeId) as { stars: number; attempts: number; hints_used: number } | undefined

    if (existing) {
      // Update: keep max stars, increment attempts, update hints_used and status
      const finalStars = Math.max(existing.stars, newStars)
      this.db
        .prepare(
          `UPDATE progress
           SET stars = ?, attempts = ?, hints_used = ?, status = ?, completed_at = ?
           WHERE user_id = ? AND challenge_id = ?`,
        )
        .run(finalStars, existing.attempts + 1, grading.hintsUsed, newStatus, completedAt, userId, challengeId)
    } else {
      // Insert new progress record
      this.db
        .prepare(
          `INSERT INTO progress (user_id, challenge_id, stars, attempts, hints_used, status, completed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(userId, challengeId, newStars, 1, grading.hintsUsed, newStatus, completedAt)
    }
  }

  getProgress(userId: number, challengeId: number): Progress {
    const row = this.db
      .prepare('SELECT * FROM progress WHERE user_id = ? AND challenge_id = ?')
      .get(userId, challengeId) as ProgressRow | undefined

    if (!row) {
      // Return default progress for uncompleted challenge
      return {
        userId,
        challengeId,
        stars: 0,
        attempts: 0,
        hintsUsed: 0,
        status: 'in_progress',
        completedAt: null,
      }
    }

    return toProgress(row)
  }

  completedChallengeIds(userId: number): number[] {
    const rows = this.db
      .prepare('SELECT challenge_id FROM progress WHERE user_id = ? AND status = ?')
      .all(userId, 'completed') as { challenge_id: number }[]
    return rows.map((r) => r.challenge_id)
  }
}
