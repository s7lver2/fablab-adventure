import type { Role } from '../users/types'

export function isAdmin(user: { role: Role } | null): user is { role: Role } {
  return user !== null && (user.role === 'admin' || user.role === 'root')
}
