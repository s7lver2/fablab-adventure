import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { setSessionCookie } from '@/lib/session/server'
import { EventLogger } from '@/lib/analytics/events'
import { recordEvent } from '@/lib/analytics/record'

export async function POST(req: Request) {
  const { username } = await req.json()
  if (typeof username !== 'string' || username.trim().length === 0) {
    return NextResponse.json({ error: 'Escribe un nombre de usuario.' }, { status: 400 })
  }
  try {
    const db = getDb()
    const repo = new UserRepository(db)
    const existing = repo.findByUsername(username.trim().toLowerCase())
    if (existing && existing.role !== 'user') {
      return NextResponse.json(
        { error: 'Esta cuenta es de administración. Entra por el acceso de admin.' },
        { status: 403 },
      )
    }
    const user = repo.findOrCreateByUsername(username)
    await setSessionCookie(user.id)

    // Registrar evento de login
    await recordEvent(new EventLogger(db), {
      type: 'login',
      userId: user.id,
      path: '/api/auth/login',
    })

    return NextResponse.json({ ok: true, user: { username: user.username, displayName: user.displayName } })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
