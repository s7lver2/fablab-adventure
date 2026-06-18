import { createHmac, timingSafeEqual } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { User } from '../users/types'

export interface SessionPayload {
  userId: number
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

export function signSession(payload: SessionPayload, secret: string): string {
  const body = base64url(JSON.stringify(payload))
  const sig = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifySession(token: string, secret: string): SessionPayload | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts
  const expected = createHmac('sha256', secret).update(body).digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (typeof parsed?.userId !== 'number') return null
    return { userId: parsed.userId }
  } catch {
    return null
  }
}

/** Resuelve el usuario a partir del token de sesión. Usado en middleware para decidir bloqueos. */
export function resolveUserFromCookie(db: Database.Database, token: string): User | null {
  const secret = process.env.SESSION_SECRET || ''
  const payload = verifySession(token, secret)
  if (!payload) return null
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId) as any
  if (!row) return null
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatar: row.avatar || '',
    avatarImage: row.avatar_image ?? null,
    profileMessage: row.profile_message || '',
    banner: row.banner || '',
    bannerImage: row.banner_image ?? null,
    role: row.role,
    hidden: row.hidden,
    createdAt: row.created_at,
    lastSeen: row.last_seen,
    chosenLanguage: row.chosen_language ?? null,
  }
}
