import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { SettingsRepository } from '@/lib/settings/repository'
import { EventLogger } from '@/lib/analytics/events'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'

export async function GET() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!isAdmin(user)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const settings = new SettingsRepository(db)
  return NextResponse.json({
    maintenance: settings.getBool('maintenance.enabled'),
    seedVersion: settings.get('seed_version') || '—',
    appeals: {
      maxPendingPerChallenge: settings.getNumber('appeals.maxPendingPerChallenge'),
      maxPendingGlobal: settings.getNumber('appeals.maxPendingGlobal'),
      cooldownHours: settings.getNumber('appeals.cooldownHours'),
    },
  })
}

export async function PATCH(req: Request) {
  const db = getDb()
  const userRepo = new UserRepository(db)
  const user = await getCurrentUser(userRepo)
  if (!isAdmin(user)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const body = await req.json() as Record<string, unknown>
  const settings = new SettingsRepository(db)
  const logger = new EventLogger(db)

  if (typeof body.maintenance === 'boolean') {
    settings.set('maintenance.enabled', String(body.maintenance))
    logger.log({ type: body.maintenance ? 'admin:maintenance_on' : 'admin:maintenance_off', userId: user.id })
  }

  return NextResponse.json({ ok: true })
}
