import { headers, cookies } from 'next/headers'
import { EventLogger, type EventInput } from './events'
import { randomUUID } from 'node:crypto'

const SESSION_COOKIE = 'fll_aid' // Analytics session ID cookie

export async function recordEvent(logger: EventLogger, input: Omit<EventInput, 'sessionId' | 'userAgent' | 'referrer'>) {
  try {
    const hdrs = await headers()
    const ckies = await cookies()

    // Obtener o crear session_id
    let sessionId = ckies.get(SESSION_COOKIE)?.value
    if (!sessionId) {
      sessionId = randomUUID()
      ckies.set(SESSION_COOKIE, sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 // 30 días
      })
    }

    const userAgent = hdrs.get('user-agent') ?? ''
    const referrer = hdrs.get('referer') ?? ''

    logger.log({
      ...input,
      sessionId,
      userAgent,
      referrer,
    })
  } catch (e) {
    // best-effort: nunca romper el flujo del alumno por analítica
    console.warn('[analytics]', (e as Error).message)
  }
}
