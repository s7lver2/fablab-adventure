import type Database from 'better-sqlite3'
import { lookupGeo } from '@/lib/analytics/geo'

export interface EventInput {
  type: string
  userId?: number | null
  path?: string
  sessionId?: string
  userAgent?: string
  referrer?: string
  meta?: Record<string, unknown>
  clientIp?: string
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
  country?: string | null
  city?: string | null
}

export interface SessionSummary {
  sessionId: string
  userId: number | null
  startedAt: number
  lastSeenAt: number
  durationMs: number
  eventCount: number
  userAgent: string
}

interface RawRow {
  id: number; type: string; user_id: number | null; path: string; session_id: string
  user_agent: string; referrer: string; meta_json: string; created_at: number
  country?: string | null; city?: string | null
}

function toRecord(r: RawRow): EventRecord {
  return {
    id: r.id, type: r.type, userId: r.user_id, path: r.path, sessionId: r.session_id,
    userAgent: r.user_agent, referrer: r.referrer, meta: JSON.parse(r.meta_json), createdAt: r.created_at,
    country: r.country ?? null, city: r.city ?? null,
  }
}

export class EventLogger {
  constructor(private db: Database.Database) {}

  log(e: EventInput): void {
    const geo = lookupGeo(e.clientIp || '0.0.0.0')
    this.db
      .prepare(
        `INSERT INTO events (type, user_id, path, session_id, user_agent, referrer, meta_json, country, city, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(e.type, e.userId ?? null, e.path ?? '', e.sessionId ?? '', e.userAgent ?? '',
        e.referrer ?? '', JSON.stringify(e.meta ?? {}), geo.country, geo.city, Date.now())
  }

  listAll(): EventRecord[] {
    return (this.db.prepare('SELECT * FROM events ORDER BY created_at').all() as RawRow[]).map(toRecord)
  }

  listRecent(windowMs: number): EventRecord[] {
    const since = Date.now() - windowMs
    return (this.db.prepare(
      'SELECT * FROM events WHERE created_at >= ? ORDER BY created_at DESC'
    ).all(since) as RawRow[]).map(toRecord)
  }

  listByTypes(types: string[]): EventRecord[] {
    if (types.length === 0) return []
    const placeholders = types.map(() => '?').join(',')
    return (this.db.prepare(
      `SELECT * FROM events WHERE type IN (${placeholders}) ORDER BY created_at DESC`
    ).all(...types) as RawRow[]).map(toRecord)
  }

  listSessions(windowMs: number): SessionSummary[] {
    const since = Date.now() - windowMs
    const rows = this.db.prepare(
      `SELECT session_id, user_id, user_agent,
              MIN(created_at) AS started_at, MAX(created_at) AS last_seen_at, COUNT(*) AS event_count
       FROM events WHERE created_at >= ? AND session_id != ''
       GROUP BY session_id ORDER BY last_seen_at DESC`
    ).all(since) as {
      session_id: string; user_id: number | null; user_agent: string
      started_at: number; last_seen_at: number; event_count: number
    }[]
    return rows.map((r) => ({
      sessionId: r.session_id, userId: r.user_id, userAgent: r.user_agent,
      startedAt: r.started_at, lastSeenAt: r.last_seen_at,
      durationMs: r.last_seen_at - r.started_at, eventCount: r.event_count,
    }))
  }

  topCountries(days = 30): { country: string; count: number }[] {
    const since = Date.now() - days * 86400000
    const rows = this.db
      .prepare('SELECT country, COUNT(*) as count FROM events WHERE country IS NOT NULL AND created_at > ? GROUP BY country ORDER BY count DESC LIMIT 10')
      .all(since) as { country: string; count: number }[]
    return rows
  }

  topCities(days = 30): { country: string; city: string; count: number }[] {
    const since = Date.now() - days * 86400000
    const rows = this.db
      .prepare('SELECT country, city, COUNT(*) as count FROM events WHERE city IS NOT NULL AND created_at > ? GROUP BY country, city ORDER BY count DESC LIMIT 10')
      .all(since) as { country: string; city: string; count: number }[]
    return rows
  }

  byDayHour(days = 30): number[][] {
    const since = Date.now() - days * 86400000
    const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0))
    const rows = this.db
      .prepare('SELECT created_at FROM events WHERE created_at > ?')
      .all(since) as { created_at: number }[]
    for (const r of rows) {
      const d = new Date(r.created_at)
      const day = (d.getDay() + 6) % 7 // Mon=0..Sun=6
      grid[day][d.getHours()]++
    }
    return grid
  }

  pageSeries(days = 7, topN = 4): { labels: string[]; series: { path: string; data: number[] }[] } {
    const since = Date.now() - days * 86400000
    const dayKeys: string[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      dayKeys.push(`${d.getMonth() + 1}/${d.getDate()}`)
    }
    const top = this.db
      .prepare("SELECT path, COUNT(*) c FROM events WHERE path IS NOT NULL AND path != '' AND created_at > ? GROUP BY path ORDER BY c DESC LIMIT ?")
      .all(since, topN) as { path: string; c: number }[]
    const series = top.map((t) => {
      const data = new Array(days).fill(0)
      const rows = this.db
        .prepare('SELECT created_at FROM events WHERE path = ? AND created_at > ?')
        .all(t.path, since) as { created_at: number }[]
      for (const r of rows) {
        const idx = days - 1 - Math.floor((Date.now() - r.created_at) / 86400000)
        if (idx >= 0 && idx < days) data[idx]++
      }
      return { path: t.path, data }
    })
    return { labels: dayKeys, series }
  }
}
