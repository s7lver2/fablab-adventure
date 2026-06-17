import type { Role } from './types'

interface Decision { allowed: boolean; reason?: string }

export function canCreateAdmin(actorRole: Role): Decision {
  if (actorRole === 'admin' || actorRole === 'root') return { allowed: true }
  return { allowed: false, reason: 'Solo un administrador puede crear administradores.' }
}

export function canChangeRole(args: { actorRole: Role; targetRole: Role; newRole: Role }): Decision {
  if (args.actorRole !== 'admin' && args.actorRole !== 'root') {
    return { allowed: false, reason: 'No tienes permiso para cambiar roles.' }
  }
  if (args.targetRole === 'root') return { allowed: false, reason: 'No se puede modificar a root.' }
  if (args.newRole === 'root') return { allowed: false, reason: 'No se puede asignar el rol root.' }
  if (args.newRole !== 'user' && args.newRole !== 'admin') {
    return { allowed: false, reason: 'Rol no válido.' }
  }
  return { allowed: true }
}
