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

export interface RecentCompletedLesson {
  challengeId: number
  stars: number
  completedAt: number
}

export interface PartProgressRow {
  userId: number
  partId: number
  stars: number
  completedAt: number | null
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

  recentCompleted(userId: number, limit: number): RecentCompletedLesson[] {
    const rows = this.db
      .prepare(
        "SELECT challenge_id, stars, completed_at FROM progress WHERE user_id = ? AND status = 'completed' AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT ?",
      )
      .all(userId, limit) as { challenge_id: number; stars: number; completed_at: number }[]
    return rows.map((r) => ({
      challengeId: r.challenge_id,
      stars: r.stars,
      completedAt: r.completed_at,
    }))
  }

  /** Get progress for a challenge part */
  getPartProgress(userId: number, partId: number): PartProgressRow | null {
    const row = this.db
      .prepare('SELECT * FROM challenge_part_progress WHERE user_id = ? AND part_id = ?')
      .get(userId, partId) as any
    if (!row) return null
    return {
      userId: row.user_id,
      partId: row.part_id,
      stars: row.stars,
      completedAt: row.completed_at,
    }
  }

  /** Record completion of a challenge part */
  recordPartCompletion(userId: number, partId: number, stars: number): void {
    const existing = this.getPartProgress(userId, partId)
    const now = Date.now()
    if (!existing) {
      this.db
        .prepare(
          'INSERT INTO challenge_part_progress (user_id, part_id, stars, completed_at) VALUES (?, ?, ?, ?)',
        )
        .run(userId, partId, stars, now)
      return
    }
    const newStars = Math.max(existing.stars, stars)
    this.db
      .prepare('UPDATE challenge_part_progress SET stars = ?, completed_at = ? WHERE user_id = ? AND part_id = ?')
      .run(newStars, existing.completedAt ?? now, userId, partId)
  }

  /** Check if all parts of a challenge are completed */
  areAllPartsCompleted(userId: number, challengeId: number): boolean {
    // Get all parts of this challenge
    const parts = this.db
      .prepare('SELECT id FROM challenge_parts WHERE challenge_id = ?')
      .all(challengeId) as { id: number }[]

    if (parts.length === 0) {
      // No parts = legacy single-part challenge, check main progress
      const progress = this.get(userId, challengeId)
      return progress?.status === 'completed' ?? false
    }

    // Check if all parts are completed
    for (const part of parts) {
      const partProgress = this.getPartProgress(userId, part.id)
      if (!partProgress || partProgress.completedAt === null) {
        return false
      }
    }
    return true
  }

  /** Get average stars across all parts of a challenge */
  getAveragePartStars(userId: number, challengeId: number): number {
    const parts = this.db
      .prepare('SELECT id FROM challenge_parts WHERE challenge_id = ?')
      .all(challengeId) as { id: number }[]

    if (parts.length === 0) return 0

    let totalStars = 0
    for (const part of parts) {
      const partProgress = this.getPartProgress(userId, part.id)
      totalStars += partProgress?.stars ?? 0
    }
    return Math.round(totalStars / parts.length)
  }
}
