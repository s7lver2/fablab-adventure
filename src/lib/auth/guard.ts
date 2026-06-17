import type { Role } from '../users/types'

export function isAdmin(user: { role: Role } | null): boolean {
  return user !== null && (user.role === 'admin' || user.role === 'root')
}
