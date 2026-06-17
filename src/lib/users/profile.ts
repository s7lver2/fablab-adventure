import type { ProfileUpdate } from './types'

export const MAX_PROFILE_MESSAGE = 100

export type ValidationResult = { ok: true } | { ok: false; error: string }

export function validateProfileUpdate(update: ProfileUpdate): ValidationResult {
  if (update.displayName.trim().length === 0) {
    return { ok: false, error: 'El nombre no puede estar vacío.' }
  }
  if (update.displayName.length > 40) {
    return { ok: false, error: 'El nombre no puede superar los 40 caracteres.' }
  }
  if (update.profileMessage.length > MAX_PROFILE_MESSAGE) {
    return { ok: false, error: `El mensaje no puede superar los ${MAX_PROFILE_MESSAGE} caracteres.` }
  }
  return { ok: true }
}
