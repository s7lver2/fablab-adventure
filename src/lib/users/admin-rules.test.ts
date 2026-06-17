import { describe, it, expect } from 'vitest'
import { canCreateAdmin, canChangeRole } from './admin-rules'

describe('reglas de roles', () => {
  it('solo admin/root pueden crear admins', () => {
    expect(canCreateAdmin('admin').allowed).toBe(true)
    expect(canCreateAdmin('root').allowed).toBe(true)
    expect(canCreateAdmin('user').allowed).toBe(false)
  })

  it('no se puede cambiar el rol de un root', () => {
    expect(canChangeRole({ actorRole: 'root', targetRole: 'root', newRole: 'admin' }).allowed).toBe(false)
  })

  it('no se puede promover a root (hidden/root no asignables por UI)', () => {
    expect(canChangeRole({ actorRole: 'root', targetRole: 'user', newRole: 'root' }).allowed).toBe(false)
  })

  it('un admin puede promover user→admin y degradar admin→user', () => {
    expect(canChangeRole({ actorRole: 'admin', targetRole: 'user', newRole: 'admin' }).allowed).toBe(true)
    expect(canChangeRole({ actorRole: 'admin', targetRole: 'admin', newRole: 'user' }).allowed).toBe(true)
  })

  it('un user no puede cambiar roles', () => {
    expect(canChangeRole({ actorRole: 'user', targetRole: 'user', newRole: 'admin' }).allowed).toBe(false)
  })
})
