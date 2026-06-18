import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { getCurrentUser, setLanguageCookie, clearLanguageCookie, getChosenLanguage } from '@/lib/session/server'
import type { Language } from '@/lib/curriculum/types'

const VALID: Language[] = ['js', 'python', 'blocks']

export async function GET() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  return NextResponse.json({ language: await getChosenLanguage(user.chosenLanguage) })
}

export async function POST(req: Request) {
  const db = getDb()
  const users = new UserRepository(db)
  const user = await getCurrentUser(users)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  const lang: unknown = body.language
  if (!VALID.includes(lang as Language)) {
    return NextResponse.json({ error: 'Lenguaje no válido' }, { status: 400 })
  }
  users.setLanguage(user.id, lang as Language)
  await setLanguageCookie(lang as Language)
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const db = getDb()
  const users = new UserRepository(db)
  const user = await getCurrentUser(users)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  db.prepare('DELETE FROM progress WHERE user_id = ?').run(user.id)
  db.prepare('UPDATE users SET chosen_language = NULL WHERE id = ?').run(user.id)
  await clearLanguageCookie()
  return NextResponse.json({ ok: true })
}
