import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { EventLogger } from '@/lib/analytics/events'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'

const ACTIVE_WINDOW_MS = 5 * 60 * 1000

export async function GET() {
  const db = getDb()
  const userRepo = new UserRepository(db)
  const user = await getCurrentUser(userRepo)
  if (!isAdmin(user)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const events = new EventLogger(db).listRecent(ACTIVE_WINDOW_MS)

  const byUser = new Map<number, { path: string; lastSeenMs: number }>()
  for (const e of events) {
    if (e.userId == null) continue
    const existing = byUser.get(e.userId)
    if (!existing || e.createdAt > existing.lastSeenMs) {
      byUser.set(e.userId, { path: e.path, lastSeenMs: e.createdAt })
    }
  }

  const activeStudents = [...byUser.entries()]
    .sort((a, b) => b[1].lastSeenMs - a[1].lastSeenMs)
    .map(([userId, data]) => {
      const u = userRepo.findById(userId)
      return { userId, username: u?.username ?? String(userId), currentPath: data.path, lastSeenMs: data.lastSeenMs }
    })

  const recentEvents = events.slice(0, 20).map((e) => {
    const u = e.userId != null ? userRepo.findById(e.userId) : null
    return { timestamp: e.createdAt, type: e.type, username: u?.username ?? 'anon', path: e.path }
  })

  return NextResponse.json({ activeCount: activeStudents.length, activeStudents, recentEvents })
}
