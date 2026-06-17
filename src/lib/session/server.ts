import { cookies } from 'next/headers'
import { signSession, verifySession } from './cookie'
import type { UserRepository } from '../users/repository'
import type { User } from '../users/types'

export const SESSION_COOKIE = 'fll_session'

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
