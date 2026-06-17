import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { EventLogger } from '@/lib/analytics/events'
import { summarize, stuckReport, type StuckRow } from '@/lib/analytics/aggregate'
import { parseUserAgent } from '@/lib/analytics/user-agent'
import { ProgressRepository } from '@/lib/progress/repository'
import { CurriculumRepository } from '@/lib/curriculum/repository'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'

export async function GET() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!isAdmin(user)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const events = new EventLogger(db).listAll()
  const summary = summarize(events)

  // Dispositivos y navegadores (agrupados)
  const deviceMap = new Map<string, number>()
  const browserMap = new Map<string, number>()
  for (const e of events) {
    const ua = parseUserAgent(e.userAgent)
    deviceMap.set(ua.device, (deviceMap.get(ua.device) ?? 0) + 1)
    browserMap.set(ua.browser, (browserMap.get(ua.browser) ?? 0) + 1)
  }

  // "Dónde se atascan"
  const progressRows = db.prepare('SELECT challenge_id, status, attempts FROM progress').all() as {
    challenge_id: number
    status: string
    attempts: number
  }[]
  const stuck = stuckReport(progressRows)
  const curriculum = new CurriculumRepository(db)
  const titleById: Record<number, string> = {}
  for (const c of curriculum.listChallenges()) titleById[c.id] = c.title

  return NextResponse.json({
    summary,
    devices: Object.fromEntries(deviceMap),
    browsers: Object.fromEntries(browserMap),
    stuck: stuck.map((s) => ({ ...s, challengeTitle: titleById[s.challengeId] ?? '' })),
  })
}
