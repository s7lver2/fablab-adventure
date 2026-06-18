import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { CurriculumRepository } from '@/lib/curriculum/repository'
import { getCurrentUser } from '@/lib/session/server'
import { EventLogger } from '@/lib/analytics/events'
import { recordEvent } from '@/lib/analytics/record'
import type { Language } from '@/lib/curriculum/types'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const db = getDb()
  const repo = new CurriculumRepository(db)
  const challenge = repo.getChallengeBySlug(slug)
  if (!challenge) return NextResponse.json({ error: 'Reto no encontrado.' }, { status: 404 })

  const user = await getCurrentUser(new UserRepository(db))
  const lang: Language = user?.chosenLanguage ?? 'js'

  await recordEvent(new EventLogger(db), {
    type: 'open_challenge',
    path: `/api/challenges/${slug}`,
    meta: { slug },
  })

  const variant = challenge.variants[lang] ?? challenge.variants.js ?? null

  // If there are no explicit parts, synthesize one from legacy data
  const parts = challenge.parts.length > 0
    ? challenge.parts.map((part) => {
        const partVariant = part.variants[lang] ?? part.variants.js ?? null
        return {
          id: part.id,
          ord: part.ord,
          variant: partVariant,
          inputs: part.testCases.map((tc) => tc.input),
        }
      })
    : [
        {
          id: 0,
          ord: 1,
          variant,
          inputs: challenge.testCases.map((tc) => tc.input),
        },
      ]

  return NextResponse.json({
    slug: challenge.slug,
    title: challenge.title,
    narrative: challenge.narrative,
    language: lang,
    variant,
    inputs: challenge.testCases.map((tc) => tc.input),
    parts,
  })
}
