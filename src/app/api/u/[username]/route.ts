import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { buildProfile } from '@/lib/users/profileStats'

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const db = getDb()
  const user = new UserRepository(db).findByUsername(username.trim().toLowerCase())
  if (!user || user.hidden) return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 404 })
  return NextResponse.json(buildProfile(db, user))
}
