import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { EventLogger } from '@/lib/analytics/events'
import { parseUserAgent } from '@/lib/analytics/user-agent'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'

const DAY_MS = 24 * 60 * 60 * 1000

export async function GET() {
  const db = getDb()
  const userRepo = new UserRepository(db)
  const user = await getCurrentUser(userRepo)
  if (!isAdmin(user)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const sessions = new EventLogger(db).listSessions(DAY_MS)

  const avgDurationMs = sessions.length
    ? Math.round(sessions.reduce((acc, s) => acc + s.durationMs, 0) / sessions.length)
    : 0
  const bounceSessions = sessions.filter((s) => s.eventCount === 1).length
  const bounceRate = sessions.length ? Math.round((bounceSessions / sessions.length) * 100) : 0

  const sessionRows = sessions.map((s) => {
    const u = s.userId != null ? userRepo.findById(s.userId) : null
    const ua = parseUserAgent(s.userAgent)
    return {
      sessionId: s.sessionId,
      username: u?.username ?? 'anónimo',
      startedAt: s.startedAt,
      durationMs: s.durationMs,
      eventCount: s.eventCount,
      device: ua.device,
      browser: ua.browser,
    }
  })

  return NextResponse.json({
    summary: { today: sessions.length, avgDurationMs, bounceRate },
    sessions: sessionRows,
  })
}
