import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { CurriculumRepository } from '@/lib/curriculum/repository'
import { UserRepository } from '@/lib/users/repository'
import { ProgressRepository } from '@/lib/progress/repository'
import { getCurrentUser } from '@/lib/session/server'
import { gradeSubmission } from '@/lib/grading/grade'
import { nextChallengeSlug } from '@/lib/progress/next'
import { EventLogger } from '@/lib/analytics/events'
import { recordEvent } from '@/lib/analytics/record'

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const db = getDb()
  const users = new UserRepository(db)
  const user = await getCurrentUser(users)
  if (!user) return NextResponse.json({ error: 'No has iniciado sesión.' }, { status: 401 })

  const body = await req.json()
  const producedOutputs: string[] = Array.isArray(body.outputs) ? body.outputs.map(String) : []
  const hintsUsed = Number(body.hintsUsed ?? 0)

  const curriculum = new CurriculumRepository(db)
  const challenge = curriculum.getChallengeBySlug(slug)
  if (!challenge) return NextResponse.json({ error: 'Reto no encontrado.' }, { status: 404 })

  const progress = new ProgressRepository(db)
  const prev = progress.get(user.id, challenge.id)
  const attempts = (prev?.attempts ?? 0) + 1

  const { correct, stars } = gradeSubmission({
    producedOutputs,
    testCases: challenge.testCases,
    attempts,
    hintsUsed,
  })
  progress.recordAttempt(user.id, challenge.id, { stars, hintsUsed, completed: correct })

  // Registrar evento de envío
  await recordEvent(new EventLogger(db), {
    type: 'submit',
    userId: user.id,
    path: `/api/challenges/${slug}/submit`,
    meta: { slug, correct, stars },
  })

  const next = nextChallengeSlug(curriculum.listChallenges(), progress.completedChallengeIds(user.id))
  return NextResponse.json({ correct, stars, next })
}
