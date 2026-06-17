import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { CurriculumRepository } from '@/lib/curriculum/repository'
import { AppealRepository } from '@/lib/appeals/repository'
import { SettingsRepository } from '@/lib/settings/repository'
import { getCurrentUser } from '@/lib/session/server'
import { submitAppeal } from '@/lib/appeals/service'

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!user) return NextResponse.json({ error: 'No has iniciado sesión.' }, { status: 401 })

  const challenge = new CurriculumRepository(db).getChallengeBySlug(slug)
  if (!challenge) return NextResponse.json({ error: 'Reto no encontrado.' }, { status: 404 })

  const body = await req.json()
  const result = submitAppeal(
    { appeals: new AppealRepository(db), settings: new SettingsRepository(db) },
    {
      userId: user.id,
      challengeId: challenge.id,
      language: String(body.language ?? 'js'),
      submittedCode: String(body.code ?? ''),
      submittedOutput: String(body.output ?? ''),
      message: String(body.message ?? '').slice(0, 500),
    },
  )
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true, id: result.id })
}
