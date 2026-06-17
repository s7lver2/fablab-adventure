import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { setSessionCookie } from '@/lib/session/server'

export async function POST(req: Request) {
  const { username, password } = await req.json()
  const repo = new UserRepository(getDb())
  const user = repo.findByUsername(String(username ?? ''))
  if (!user || (user.role !== 'admin' && user.role !== 'root')) {
    return NextResponse.json({ error: 'Credenciales no válidas.' }, { status: 401 })
  }
  if (!repo.verifyPassword(user.username, String(password ?? ''))) {
    return NextResponse.json({ error: 'Credenciales no válidas.' }, { status: 401 })
  }
  await setSessionCookie(user.id)
  return NextResponse.json({ ok: true })
}
