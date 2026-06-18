import type { ProfileUpdate } from './types'
import { isPresetId } from './banners'

export const MAX_PROFILE_MESSAGE = 100
export const MAX_BANNER_IMAGE_CHARS = 700_000 // ~500 KB base64

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

  // Validate banner token
  if (update.banner !== '' && update.banner !== 'upload' && !update.banner.startsWith('preset:')) {
    return { ok: false, error: 'Banner inválido.' }
  }
  if (update.banner.startsWith('preset:')) {
    const presetId = update.banner.slice(7)
    if (!isPresetId(presetId)) {
      return { ok: false, error: 'El preset de banner no existe.' }
    }
  }

  // Validate banner image when banner is 'upload'
  if (update.banner === 'upload') {
    if (!update.bannerImage) {
      return { ok: false, error: 'Se requiere una imagen para el banner de carga.' }
    }
    if (!update.bannerImage.match(/^data:image\/(png|jpe?g|webp|gif);base64,/)) {
      return { ok: false, error: 'La imagen del banner debe ser PNG, JPEG, WebP o GIF en formato base64.' }
    }
    if (update.bannerImage.length > MAX_BANNER_IMAGE_CHARS) {
      return { ok: false, error: `La imagen del banner no puede superar ${MAX_BANNER_IMAGE_CHARS} caracteres.` }
    }
  }

  // Validate avatar image (optional)
  if (update.avatarImage !== null && update.avatarImage !== undefined) {
    if (!update.avatarImage.match(/^data:image\/(png|jpe?g|webp|gif);base64,/)) {
      return { ok: false, error: 'La imagen del avatar debe ser PNG, JPEG, WebP o GIF en formato base64.' }
    }
    if (update.avatarImage.length > MAX_BANNER_IMAGE_CHARS) {
      return { ok: false, error: `La imagen del avatar no puede superar ${MAX_BANNER_IMAGE_CHARS} caracteres.` }
    }
  }

  return { ok: true }
}
