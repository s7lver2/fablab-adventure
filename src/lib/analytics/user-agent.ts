export interface UAInfo { browser: string; os: string; device: string }

export function parseUserAgent(ua: string): UAInfo {
  if (!ua) return { browser: 'Desconocido', os: 'Desconocido', device: 'Desconocido' }
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua)
  const os = /Android/i.test(ua) ? 'Android'
    : /iPhone|iPad|iOS/i.test(ua) ? 'iOS'
    : /Windows/i.test(ua) ? 'Windows'
    : /Mac OS X|Macintosh/i.test(ua) ? 'macOS'
    : /Linux/i.test(ua) ? 'Linux'
    : 'Desconocido'
  const browser = /Edg\//i.test(ua) ? 'Edge'
    : /Chrome\//i.test(ua) ? 'Chrome'
    : /Firefox\//i.test(ua) ? 'Firefox'
    : /Safari\//i.test(ua) ? 'Safari'
    : 'Desconocido'
  return { browser, os, device: isMobile ? 'Móvil' : 'Escritorio' }
}
