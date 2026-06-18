export interface GeoInfo {
  country: string
  countryCode: string
  city: string
}

const FLAGS: Record<string, string> = {
  ES: '🇪🇸',
  MX: '🇲🇽',
  AR: '🇦🇷',
  PT: '🇵🇹',
  CO: '🇨🇴',
  CL: '🇨🇱',
  PE: '🇵🇪',
  US: '🇺🇸',
  '??': '🏳️',
}

const COUNTRY_NAMES: Record<string, string> = {
  ES: 'España',
  MX: 'México',
  AR: 'Argentina',
  PT: 'Portugal',
  CO: 'Colombia',
  CL: 'Chile',
  PE: 'Perú',
  US: 'Estados Unidos',
  '??': 'Desconocido',
}

export function flagFor(code: string): string {
  return FLAGS[code] ?? '🏳️'
}

export function countryNameFor(code: string): string {
  return COUNTRY_NAMES[code] ?? code
}

const DEMO_TABLE: { country: string; countryCode: string; city: string }[] = [
  { country: 'España', countryCode: 'ES', city: 'Madrid' },
  { country: 'España', countryCode: 'ES', city: 'Barcelona' },
  { country: 'México', countryCode: 'MX', city: 'Guadalajara' },
  { country: 'Argentina', countryCode: 'AR', city: 'Córdoba' },
  { country: 'Portugal', countryCode: 'PT', city: 'Lisboa' },
  { country: 'Colombia', countryCode: 'CO', city: 'Bogotá' },
]

// TODO(geo-ip): replace this demo with a real geo-IP lookup (e.g. MaxMind GeoLite2
// or an external API). The `ip` argument is already captured by EventLogger.
export function lookupGeo(ip: string | null): GeoInfo {
  if (!ip) return { country: 'Desconocido', countryCode: '??', city: 'Desconocida' }
  let h = 0
  for (let i = 0; i < ip.length; i++) h = (h * 31 + ip.charCodeAt(i)) >>> 0
  return DEMO_TABLE[h % DEMO_TABLE.length]
}

export const DEMO_COUNTRIES = [
  { code: 'ES', name: 'España', flag: '🇪🇸', count: 31 },
  { code: 'MX', name: 'México', flag: '🇲🇽', count: 7 },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', count: 5 },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', count: 3 },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', count: 2 },
]

export const DEMO_CITIES = [
  { city: 'Madrid', country: 'España', flag: '🇪🇸', count: 18 },
  { city: 'Barcelona', country: 'España', flag: '🇪🇸', count: 9 },
  { city: 'Guadalajara', country: 'México', flag: '🇲🇽', count: 5 },
  { city: 'Córdoba', country: 'Argentina', flag: '🇦🇷', count: 4 },
  { city: 'Lisboa', country: 'Portugal', flag: '🇵🇹', count: 3 },
]
