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
  const partId = body.partId ? Number(body.partId) : null

  const curriculum = new CurriculumRepository(db)
  const challenge = curriculum.getChallengeBySlug(slug)
  if (!challenge) return NextResponse.json({ error: 'Reto no encontrado.' }, { status: 404 })

  const progress = new ProgressRepository(db)

  // Handle multi-part submission
  if (partId !== null) {
    // Grade a specific part
    const part = challenge.parts.find((p) => p.id === partId)
    if (!part) return NextResponse.json({ error: 'Parte no encontrada.' }, { status: 404 })

    const { correct, stars } = gradeSubmission({
      producedOutputs,
      testCases: part.testCases,
      attempts: 1, // TODO: track attempts per part
      hintsUsed,
    })

    progress.recordPartCompletion(user.id, partId, stars)

    // Check if all parts are now complete
    const allComplete = progress.areAllPartsCompleted(user.id, challenge.id)
    if (allComplete) {
      const challengeStars = progress.getAveragePartStars(user.id, challenge.id)
      progress.recordAttempt(user.id, challenge.id, { stars: challengeStars, hintsUsed, completed: true })
    }

    // Find next part
    const nextPart = challenge.parts.find((p) => !progress.getPartProgress(user.id, p.id)?.completedAt)

    await recordEvent(new EventLogger(db), {
      type: 'submit',
      userId: user.id,
      path: `/api/challenges/${slug}/submit`,
      meta: { slug, partId, correct, stars },
    })

    const next = nextChallengeSlug(curriculum.listChallenges(), progress.completedChallengeIds(user.id))
    return NextResponse.json({
      correct,
      stars,
      nextPartId: nextPart?.id ?? null,
      challengeComplete: allComplete,
      next,
    })
  }

  // Legacy: grade entire challenge (no parts)
  const prev = progress.get(user.id, challenge.id)
  const attempts = (prev?.attempts ?? 0) + 1

  const testCases = challenge.parts.length > 0 ? challenge.parts[0]?.testCases ?? [] : challenge.testCases
  const { correct, stars } = gradeSubmission({
    producedOutputs,
    testCases,
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
  return NextResponse.json({ correct, stars, next, challengeComplete: correct })
}
