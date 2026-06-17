import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { setSessionCookie } from '@/lib/session/server'

export async function POST(req: Request) {
  const { username } = await req.json()
  if (typeof username !== 'string' || username.trim().length === 0) {
    return NextResponse.json({ error: 'Escribe un nombre de usuario.' }, { status: 400 })
  }
  try {
    const repo = new UserRepository(getDb())
    const user = repo.findOrCreateByUsername(username)
    await setSessionCookie(user.id)
    return NextResponse.json({ ok: true, user: { username: user.username, displayName: user.displayName } })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
