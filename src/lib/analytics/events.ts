import type Database from 'better-sqlite3'

export interface EventInput {
  type: string
  userId?: number | null
  path?: string
  sessionId?: string
  userAgent?: string
  referrer?: string
  meta?: Record<string, unknown>
}

export interface EventRecord {
  id: number
  type: string
  userId: number | null
  path: string
  sessionId: string
  userAgent: string
  referrer: string
  meta: Record<string, unknown>
  createdAt: number
}

export class EventLogger {
  constructor(private db: Database.Database) {}

  log(e: EventInput): void {
    this.db
      .prepare(
        `INSERT INTO events (type, user_id, path, session_id, user_agent, referrer, meta_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        e.type,
        e.userId ?? null,
        e.path ?? '',
        e.sessionId ?? '',
        e.userAgent ?? '',
        e.referrer ?? '',
        JSON.stringify(e.meta ?? {}),
        Date.now(),
      )
  }

  listAll(): EventRecord[] {
    const rows = this.db.prepare('SELECT * FROM events ORDER BY created_at').all() as {
      id: number; type: string; user_id: number | null; path: string; session_id: string
      user_agent: string; referrer: string; meta_json: string; created_at: number
    }[]
    return rows.map((r) => ({
      id: r.id, type: r.type, userId: r.user_id, path: r.path, sessionId: r.session_id,
      userAgent: r.user_agent, referrer: r.referrer, meta: JSON.parse(r.meta_json), createdAt: r.created_at,
    }))
  }
}
