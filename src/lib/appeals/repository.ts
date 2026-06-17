import type Database from 'better-sqlite3'
import type { Appeal, NewAppeal } from './types'

interface Row {
  id: number
  user_id: number
  challenge_id: number
  language: string
  submitted_code: string
  submitted_output: string
  message: string
  status: 'pending' | 'accepted' | 'rejected'
  reviewer_admin_id: number | null
  feedback: string
  created_at: number
  resolved_at: number | null
}

function toAppeal(r: Row): Appeal {
  return {
    id: r.id,
    userId: r.user_id,
    challengeId: r.challenge_id,
    language: r.language,
    submittedCode: r.submitted_code,
    submittedOutput: r.submitted_output,
    message: r.message,
    status: r.status,
    reviewerAdminId: r.reviewer_admin_id,
    feedback: r.feedback,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at,
  }
}

export class AppealRepository {
  constructor(private db: Database.Database) {}

  create(a: NewAppeal): number {
    const info = this.db
      .prepare(
        `INSERT INTO review_requests
           (user_id, challenge_id, language, submitted_code, submitted_output, message, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      )
      .run(a.userId, a.challengeId, a.language, a.submittedCode, a.submittedOutput, a.message, Date.now())
    return Number(info.lastInsertRowid)
  }

  getById(id: number): Appeal | null {
    const row = this.db.prepare('SELECT * FROM review_requests WHERE id = ?').get(id) as Row | undefined
    return row ? toAppeal(row) : null
  }

  listByUser(userId: number): Appeal[] {
    const rows = this.db
      .prepare('SELECT * FROM review_requests WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Row[]
    return rows.map(toAppeal)
  }

  listPending(): Appeal[] {
    const rows = this.db
      .prepare("SELECT * FROM review_requests WHERE status = 'pending' ORDER BY created_at ASC")
      .all() as Row[]
    return rows.map(toAppeal)
  }

  countPendingForChallenge(userId: number, challengeId: number): number {
    const row = this.db
      .prepare(
        "SELECT COUNT(*) AS n FROM review_requests WHERE user_id = ? AND challenge_id = ? AND status = 'pending'",
      )
      .get(userId, challengeId) as { n: number }
    return row.n
  }

  countPendingGlobal(userId: number): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS n FROM review_requests WHERE user_id = ? AND status = 'pending'")
      .get(userId) as { n: number }
    return row.n
  }

  lastRejectedAt(userId: number, challengeId: number): number | null {
    const row = this.db
      .prepare(
        "SELECT MAX(resolved_at) AS t FROM review_requests WHERE user_id = ? AND challenge_id = ? AND status = 'rejected'",
      )
      .get(userId, challengeId) as { t: number | null }
    return row.t ?? null
  }

  resolve(id: number, status: 'accepted' | 'rejected', feedback: string, reviewerId: number): void {
    this.db
      .prepare(
        `UPDATE review_requests SET status = ?, reviewer_admin_id = ?, feedback = ?, resolved_at = ?
         WHERE id = ?`,
      )
      .run(status, reviewerId, feedback, Date.now(), id)
  }
}
