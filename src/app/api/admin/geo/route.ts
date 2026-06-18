import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'
import { DEMO_COUNTRIES, DEMO_CITIES } from '@/lib/analytics/geo'

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000

export async function GET() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!isAdmin(user)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  // For now, return demo data. Once EventLogger has topCountries/topCities methods,
  // call those instead.
  const countries = DEMO_COUNTRIES
  const cities = DEMO_CITIES
  const totalLocated = countries.reduce((acc, c) => acc + c.count, 0)

  return NextResponse.json({ countries, cities, totalLocated })
}
