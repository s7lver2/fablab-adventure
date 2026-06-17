export interface AppealCounts {
  pendingForChallenge: number
  pendingGlobal: number
  lastRejectedAt: number | null
}

export interface AppealLimits {
  maxPendingPerChallenge: number
  maxPendingGlobal: number
  cooldownHours: number
}

export interface AppealDecision {
  allowed: boolean
  reason?: string
}

/** Aplica las tres reglas del spec §7. Pura y testeable. */
export function canCreateAppeal(
  counts: AppealCounts,
  limits: AppealLimits,
  now: number,
): AppealDecision {
  if (counts.pendingForChallenge >= limits.maxPendingPerChallenge) {
    return { allowed: false, reason: 'Ya tienes una solicitud pendiente para este reto.' }
  }
  if (counts.pendingGlobal >= limits.maxPendingGlobal) {
    return {
      allowed: false,
      reason: `Solo puedes tener ${limits.maxPendingGlobal} solicitudes pendientes a la vez.`,
    }
  }
  if (counts.lastRejectedAt !== null) {
    const elapsedHours = (now - counts.lastRejectedAt) / (1000 * 60 * 60)
    if (elapsedHours < limits.cooldownHours) {
      const wait = Math.ceil(limits.cooldownHours - elapsedHours)
      return {
        allowed: false,
        reason: `Podrás volver a solicitar revisión de este reto en unas ${wait} horas.`,
      }
    }
  }
  return { allowed: true }
}
