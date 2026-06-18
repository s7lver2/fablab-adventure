import { cookies } from 'next/headers'
import { signSession, verifySession } from './cookie'
import type { UserRepository } from '../users/repository'
import type { User } from '../users/types'
import type { Language } from '../curriculum/types'

export const SESSION_COOKIE = 'fll_session'

// El lenguaje elegido se guarda TAMBIÉN en una cookie. En Vercel (serverless) la DB
// vive en /tmp y es distinta por instancia, así que el valor escrito en la DB no se
// lee de forma fiable en la siguiente petición. La cookie viaja con cada request y es
// consistente entre instancias: la usamos como fuente de verdad para el lenguaje.
export const LANG_COOKIE = 'fll_lang'

function isLanguage(v: unknown): v is Language {
  return v === 'js' || v === 'python' || v === 'blocks'
}

/** Escribe el lenguaje elegido en una cookie legible en cualquier instancia. */
export async function setLanguageCookie(lang: Language): Promise<void> {
  const store = await cookies()
  store.set(LANG_COOKIE, lang, { sameSite: 'lax', path: '/' })
}

export async function clearLanguageCookie(): Promise<void> {
  const store = await cookies()
  store.delete(LANG_COOKIE)
}

/** Lenguaje elegido: prioriza la cookie y cae al valor de la DB si no hay cookie. */
export async function getChosenLanguage(dbFallback: Language | null): Promise<Language | null> {
  const store = await cookies()
  const value = store.get(LANG_COOKIE)?.value
  return isLanguage(value) ? value : dbFallback
}

function getSecret(): string {
  return process.env.SESSION_SECRET ?? 'dev-insecure-secret-change-me'
}

/** Función pura testeable: resuelve un usuario dado el valor de la cookie. */
export function resolveUserFromCookie(
  cookieValue: string | undefined,
  secret: string,
  repo: UserRepository,
): User | null {
  if (!cookieValue) return null
  const payload = verifySession(cookieValue, secret)
  if (!payload) return null
  return repo.findById(payload.userId)
}

/** Escribe la cookie de sesión (uso en route handlers / server actions). */
export async function setSessionCookie(userId: number): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, signSession({ userId }, getSecret()), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

/** Lee el usuario actual desde la cookie de la petición. */
export async function getCurrentUser(repo: UserRepository): Promise<User | null> {
  const store = await cookies()
  const value = store.get(SESSION_COOKIE)?.value
  return resolveUserFromCookie(value, getSecret(), repo)
}
