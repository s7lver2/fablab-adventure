/**
 * Discord-style user profile banner presets and utilities.
 * Banners are stored as token IDs (e.g., "preset:sunset") + optional base64 image.
 */

export interface BannerPreset {
  id: string
  label: string
  css: string
}

/**
 * 8 gradient presets using existing warm theme tokens.
 * Each uses a gradient direction and two warm theme colors.
 */
export const BANNER_PRESETS: BannerPreset[] = [
  {
    id: 'sunset',
    label: 'Sunset',
    css: 'linear-gradient(135deg, var(--amber) 0%, var(--violet) 100%)',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    css: 'linear-gradient(135deg, var(--blue) 0%, var(--cyan) 100%)',
  },
  {
    id: 'forest',
    label: 'Forest',
    css: 'linear-gradient(135deg, var(--green) 0%, var(--teal) 100%)',
  },
  {
    id: 'candy',
    label: 'Candy',
    css: 'linear-gradient(135deg, var(--pink) 0%, var(--rose) 100%)',
  },
  {
    id: 'fire',
    label: 'Fire',
    css: 'linear-gradient(135deg, var(--orange) 0%, var(--red) 100%)',
  },
  {
    id: 'night',
    label: 'Night',
    css: 'linear-gradient(135deg, var(--slate) 0%, var(--indigo) 100%)',
  },
  {
    id: 'mint',
    label: 'Mint',
    css: 'linear-gradient(135deg, var(--emerald) 0%, var(--cyan) 100%)',
  },
  {
    id: 'gold',
    label: 'Gold',
    css: 'linear-gradient(135deg, var(--yellow) 0%, var(--amber) 100%)',
  },
]

/**
 * Check if an ID is a valid preset banner ID.
 * @param id - The ID to validate
 * @returns true if the ID corresponds to a preset
 */
export function isPresetId(id: string): boolean {
  return BANNER_PRESETS.some((p) => p.id === id)
}

/**
 * Get the CSS background value for a banner.
 * If banner starts with "preset:", uses the preset gradient.
 * Otherwise, if bannerImage is provided, uses it as background.
 * Falls back to default if neither is valid.
 * @param banner - Banner token (e.g., "preset:sunset" or "upload")
 * @param bannerImage - Optional base64 image data
 * @returns CSS background value for inline styles
 */
export function bannerCss(banner: string, bannerImage: string | null): string {
  if (banner.startsWith('preset:')) {
    const presetId = banner.slice(7) // Remove "preset:" prefix
    const preset = BANNER_PRESETS.find((p) => p.id === presetId)
    if (preset) {
      return preset.css
    }
  }

  if (bannerImage) {
    return `url('${bannerImage}') center / cover`
  }

  // Fallback to default Sunset preset
  return BANNER_PRESETS[0]!.css
}
