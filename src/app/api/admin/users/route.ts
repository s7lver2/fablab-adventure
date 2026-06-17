import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'
import { canCreateAdmin, canChangeRole } from '@/lib/users/admin-rules'
import { EventLogger } from '@/lib/analytics/events'

export async function GET() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!isAdmin(user)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const repo = new UserRepository(db)
  const users = repo.listAll(false) // no incluir hidden
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const db = getDb()
  const users = new UserRepository(db)
  const actor = await getCurrentUser(users)
  if (!isAdmin(actor)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const rule = canCreateAdmin(actor.role)
  if (!rule.allowed) return NextResponse.json({ error: rule.reason }, { status: 403 })

  const body = await req.json()
  const username = String(body.username ?? '').trim().toLowerCase()
  const displayName = String(body.displayName ?? '')
  const password = String(body.password ?? '')

  if (!username || !password) {
    return NextResponse.json({ error: 'Se requieren nombre de usuario y contraseña.' }, { status: 400 })
  }

  try {
    const created = users.createAdmin(username, displayName, password)
    new EventLogger(db).log({ type: 'admin:user_create', userId: actor.id, meta: { username } })
    return NextResponse.json({ ok: true, user: created })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}

export async function PATCH(req: Request) {
  const db = getDb()
  const users = new UserRepository(db)
  const actor = await getCurrentUser(users)
  if (!isAdmin(actor)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const body = await req.json()
  const targetId = Number(body.userId)
  const newRole = String(body.role)

  const target = users.findById(targetId)
  if (!target) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })

  const rule = canChangeRole({ actorRole: actor.role, targetRole: target.role, newRole: newRole as any })
  if (!rule.allowed) return NextResponse.json({ error: rule.reason }, { status: 403 })

  users.setRole(targetId, newRole as any)
  new EventLogger(db).log({ type: 'admin:role_change', userId: actor.id, meta: { targetId, newRole } })
  return NextResponse.json({ ok: true })
}
