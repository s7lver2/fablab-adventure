import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { EventLogger } from '@/lib/analytics/events'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'

const ADMIN_TYPES = [
  'admin:appeal_accept', 'admin:appeal_reject',
  'admin:user_create', 'admin:role_change',
  'admin:maintenance_on', 'admin:maintenance_off',
]

export async function GET() {
  const db = getDb()
  const userRepo = new UserRepository(db)
  const user = await getCurrentUser(userRepo)
  if (!isAdmin(user)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const events = new EventLogger(db).listByTypes(ADMIN_TYPES)

  const entries = events.slice(0, 100).map((e) => {
    const admin = e.userId != null ? userRepo.findById(e.userId) : null
    return { id: e.id, timestamp: e.createdAt, adminUsername: admin?.username ?? '?', type: e.type, meta: e.meta }
  })

  return NextResponse.json(entries)
}
