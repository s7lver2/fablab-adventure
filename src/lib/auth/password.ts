import { createHash, timingSafeEqual } from 'node:crypto'

export function hashPassword(plain: string): string {
  return createHash('sha256').update(plain).digest('hex')
}

export function verifyPassword(plain: string, hash: string): boolean {
  const a = Buffer.from(hashPassword(plain))
  const b = Buffer.from(hash)
  return a.length === b.length && timingSafeEqual(a, b)
}
