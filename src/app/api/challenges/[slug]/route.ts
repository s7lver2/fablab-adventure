import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { CurriculumRepository } from '@/lib/curriculum/repository'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const repo = new CurriculumRepository(getDb())
  const challenge = repo.getChallengeBySlug(slug)
  if (!challenge) return NextResponse.json({ error: 'Reto no encontrado.' }, { status: 404 })
  // Importante: NO enviamos expectedOutput al cliente.
  return NextResponse.json({
    slug: challenge.slug,
    title: challenge.title,
    narrative: challenge.narrative,
    variant: challenge.variants.js ?? null,
    inputs: challenge.testCases.map((tc) => tc.input),
  })
}
