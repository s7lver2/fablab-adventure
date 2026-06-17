import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { SettingsRepository } from '@/lib/settings/repository'
import { getCurrentUser } from '@/lib/session/server'

export async function GET() {
  try {
    const db = getDb()
    const user = await getCurrentUser(new UserRepository(db))
    const settings = new SettingsRepository(db)
    const maintenanceEnabled = settings.getBool('maintenance.enabled')
    const isAdmin = user !== null && (user.role === 'admin' || user.role === 'root')

    return NextResponse.json({
      enabled: maintenanceEnabled,
      isAdmin,
    })
  } catch (e) {
    return NextResponse.json({ enabled: false, isAdmin: false })
  }
}
