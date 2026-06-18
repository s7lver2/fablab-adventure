import type { ProfileUpdate } from './types'
import { isPresetId } from './banners'

export const MAX_PROFILE_MESSAGE = 100
export const MAX_BANNER_IMAGE_SIZE = 500 * 1024 // 500 KB

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

  // Validate banner
  if (update.banner && !update.banner.startsWith('preset:') && update.banner !== 'upload') {
    return { ok: false, error: 'Banner inválido.' }
  }
  if (update.banner.startsWith('preset:')) {
    const presetId = update.banner.slice(7)
    if (!isPresetId(presetId)) {
      return { ok: false, error: 'El preset de banner no existe.' }
    }
  }

  // Validate banner image
  if (update.bannerImage) {
    if (!update.bannerImage.startsWith('data:image/')) {
      return { ok: false, error: 'La imagen del banner debe ser en formato base64.' }
    }
    const sizeEstimate = (update.bannerImage.length * 3) / 4
    if (sizeEstimate > MAX_BANNER_IMAGE_SIZE) {
      return { ok: false, error: `La imagen del banner no puede superar ${MAX_BANNER_IMAGE_SIZE / 1024} KB.` }
    }
    if (!/(png|jpeg|webp|gif)/.test(update.bannerImage)) {
      return { ok: false, error: 'La imagen del banner debe ser PNG, JPEG, WebP o GIF.' }
    }
  }

  return { ok: true }
}
