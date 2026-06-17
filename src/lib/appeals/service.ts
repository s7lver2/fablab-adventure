import type { AppealRepository } from './repository'
import type { SettingsRepository } from '../settings/repository'
import type { NewAppeal } from './types'
import { canCreateAppeal } from './limits'

export interface AppealDeps {
  appeals: AppealRepository
  settings: SettingsRepository
}

export interface AppealResult {
  ok: boolean
  id?: number
  error?: string
}

/** Aplica límites y crea la apelación. El código NO se ejecuta — solo se guarda. */
export function submitAppeal(deps: AppealDeps, input: NewAppeal): AppealResult {
  const { appeals, settings } = deps
  const decision = canCreateAppeal(
    {
      pendingForChallenge: appeals.countPendingForChallenge(input.userId, input.challengeId),
      pendingGlobal: appeals.countPendingGlobal(input.userId),
      lastRejectedAt: appeals.lastRejectedAt(input.userId, input.challengeId),
    },
    {
      maxPendingPerChallenge: settings.getNumber('appeals.maxPendingPerChallenge'),
      maxPendingGlobal: settings.getNumber('appeals.maxPendingGlobal'),
      cooldownHours: settings.getNumber('appeals.cooldownHours'),
    },
    Date.now(),
  )
  if (!decision.allowed) return { ok: false, error: decision.reason }
  const id = appeals.create(input)
  return { ok: true, id }
}
