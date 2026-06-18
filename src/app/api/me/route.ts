import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { getCurrentUser } from '@/lib/session/server'
import { validateProfileUpdate } from '@/lib/users/profile'

export async function GET() {
  const repo = new UserRepository(getDb())
  const user = await getCurrentUser(repo)
  if (!user) return NextResponse.json({ user: null }, { status: 401 })
  return NextResponse.json({ user })
}

export async function PATCH(req: Request) {
  const repo = new UserRepository(getDb())
  const user = await getCurrentUser(repo)
  if (!user) return NextResponse.json({ error: 'No has iniciado sesión.' }, { status: 401 })
  const body = await req.json()
  const update = {
    displayName: String(body.displayName ?? ''),
    avatar: String(body.avatar ?? ''),
    profileMessage: String(body.profileMessage ?? ''),
    banner: String(body.banner ?? 'preset:sunset'),
    bannerImage: body.bannerImage ?? null,
  }
  const v = validateProfileUpdate(update)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
  repo.updateProfile(user.id, update)
  return NextResponse.json({ ok: true })
}
