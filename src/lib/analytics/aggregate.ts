import type { EventRecord } from './events'

export interface Summary {
  totalEvents: number
  sessions: number
  activeUsers: number
  bounceSessions: number
  avgSessionMs: number
  byHour: number[] // 24 posiciones
}

export function summarize(events: EventRecord[]): Summary {
  const bySession = new Map<string, number[]>() // sessionId -> timestamps
  const users = new Set<number>()
  const byHour = new Array(24).fill(0) as number[]

  for (const e of events) {
    if (!bySession.has(e.sessionId)) bySession.set(e.sessionId, [])
    bySession.get(e.sessionId)!.push(e.createdAt)
    if (e.userId != null) users.add(e.userId)
    byHour[new Date(e.createdAt).getUTCHours()]++
  }

  let bounce = 0
  let totalDuration = 0
  for (const ts of bySession.values()) {
    if (ts.length === 1) bounce++
    totalDuration += Math.max(...ts) - Math.min(...ts)
  }

  return {
    totalEvents: events.length,
    sessions: bySession.size,
    activeUsers: users.size,
    bounceSessions: bounce,
    avgSessionMs: bySession.size ? Math.round(totalDuration / bySession.size) : 0,
    byHour,
  }
}

export interface StuckRow { challengeId: number; current: number; avgAttempts: number }

export function stuckReport(
  progress: { challengeId: number; status: string; attempts: number }[],
): StuckRow[] {
  const byChallenge = new Map<number, { attempts: number[]; stuck: number }>()
  for (const p of progress) {
    if (!byChallenge.has(p.challengeId)) byChallenge.set(p.challengeId, { attempts: [], stuck: 0 })
    const e = byChallenge.get(p.challengeId)!
    e.attempts.push(p.attempts)
    if (p.status !== 'completed') e.stuck++
  }
  return [...byChallenge.entries()].map(([challengeId, e]) => ({
    challengeId,
    current: e.stuck,
    avgAttempts: e.attempts.length ? e.attempts.reduce((a, b) => a + b, 0) / e.attempts.length : 0,
  }))
}
