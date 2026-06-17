import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { AppealRepository } from '@/lib/appeals/repository'
import { CurriculumRepository } from '@/lib/curriculum/repository'
import { getCurrentUser } from '@/lib/session/server'

export async function GET() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const appeals = new AppealRepository(db).listByUser(user.id)
  const curriculum = new CurriculumRepository(db)
  const titleById: Record<number, string> = {}
  for (const c of curriculum.listChallenges()) titleById[c.id] = c.title

  return NextResponse.json(
    appeals.map((a) => ({
      id: a.id,
      challengeTitle: titleById[a.challengeId] ?? '',
      status: a.status,
      feedback: a.feedback,
      createdAt: a.createdAt,
    })),
  )
}
