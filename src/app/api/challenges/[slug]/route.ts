import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { CurriculumRepository } from '@/lib/curriculum/repository'
import { EventLogger } from '@/lib/analytics/events'
import { recordEvent } from '@/lib/analytics/record'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const db = getDb()
  const repo = new CurriculumRepository(db)
  const challenge = repo.getChallengeBySlug(slug)
  if (!challenge) return NextResponse.json({ error: 'Reto no encontrado.' }, { status: 404 })

  // Registrar evento de apertura de reto
  await recordEvent(new EventLogger(db), {
    type: 'open_challenge',
    path: `/api/challenges/${slug}`,
    meta: { slug },
  })

  // Importante: NO enviamos expectedOutput al cliente.
  return NextResponse.json({
    slug: challenge.slug,
    title: challenge.title,
    narrative: challenge.narrative,
    variant: challenge.variants.js ?? null,
    inputs: challenge.testCases.map((tc) => tc.input),
  })
}
