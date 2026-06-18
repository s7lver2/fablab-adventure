import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'
import { EventLogger } from '@/lib/analytics/events'
import { flagFor, countryNameFor } from '@/lib/analytics/geo'

export async function GET() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!isAdmin(user)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const eventLogger = new EventLogger(db)
  const topCountriesData = eventLogger.topCountries(30)
  const topCitiesData = eventLogger.topCities(30)

  const countries = topCountriesData.map((row) => ({
    country: row.country,
    name: countryNameFor(row.country),
    flag: flagFor(row.country),
    count: row.count,
  }))

  const cities = topCitiesData.map((row) => ({
    country: row.country,
    city: row.city,
    flag: flagFor(row.country),
    count: row.count,
  }))

  const totalLocated = countries.reduce((acc, c) => acc + c.count, 0)

  return NextResponse.json({ countries, cities, totalLocated })
}
