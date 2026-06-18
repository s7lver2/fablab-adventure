import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { AppealRepository } from '@/lib/appeals/repository'
import { EventLogger } from '@/lib/analytics/events'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'

export async function GET() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!isAdmin(user)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const appeals = new AppealRepository(db).listPending()
  return NextResponse.json(appeals)
}

export async function PATCH(req: Request) {
  const db = getDb()
  const users = new UserRepository(db)
  const user = await getCurrentUser(users)
  if (!isAdmin(user)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const body = await req.json() as { id: number; status: string; feedback?: string }
  const { id, status, feedback = '' } = body

  if (!id || (status !== 'accepted' && status !== 'rejected')) {
    return NextResponse.json({ error: 'Parámetros inválidos.' }, { status: 400 })
  }

  const appeals = new AppealRepository(db)
  const appeal = appeals.getById(id)
  if (!appeal) return NextResponse.json({ error: 'Apelación no encontrada.' }, { status: 404 })

  appeals.resolve(id, status, feedback, user.id)

  // Extract client IP from headers (Cloudflare CF-Connecting-IP, X-Forwarded-For, or fallback)
  const clientIp = (req.headers.get('cf-connecting-ip') ||
                    req.headers.get('x-forwarded-for')?.split(',')[0] ||
                    req.headers.get('x-real-ip') ||
                    '0.0.0.0').trim()

  new EventLogger(db).log({
    type: status === 'accepted' ? 'admin:appeal_accept' : 'admin:appeal_reject',
    userId: user.id,
    clientIp,
    meta: { appealId: id, reviewedBy: user.username },
  })

  return NextResponse.json({ ok: true })
}
