'use client'
import { useEffect, useState } from 'react'

interface UserView {
  id: number
  username: string
  displayName: string
  role: 'user' | 'admin' | 'root'
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserView[]>([])
  const [newUsername, setNewUsername] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [selectedUser, setSelectedUser] = useState<number | null>(null)
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin'>('user')

  useEffect(() => {
    fetch('/api/admin/users').then((r) => r.json()).then(setUsers)
  }, [])

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: newUsername,
        displayName: newDisplayName,
        password: newPassword,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMsg(`Error: ${data.error}`)
      return
    }
    setMsg('Administrador creado.')
    setNewUsername('')
    setNewDisplayName('')
    setNewPassword('')
    setUsers([...users, data.user])
  }

  async function changeRole(userId: number, newRole: 'user' | 'admin') {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: newRole }),
    })
    if (res.ok) {
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
      setSelectedUser(null)
      setMsg('Rol actualizado.')
    } else {
      const data = await res.json()
      setMsg(`Error: ${data.error}`)
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: '2rem auto', fontFamily: 'system-ui' }}>
      <h1>Gestión de usuarios</h1>

      <section>
        <h2>Crear administrador</h2>
        <form onSubmit={createAdmin} style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400 }}>
          <input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Usuario"
            required
          />
          <input
            value={newDisplayName}
            onChange={(e) => setNewDisplayName(e.target.value)}
            placeholder="Nombre mostrado"
          />
          <input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Contraseña"
            type="password"
            required
          />
          <button type="submit">Crear</button>
        </form>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Usuarios</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ccc' }}>
              <th style={{ textAlign: 'left', padding: 8 }}>Usuario</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Nombre</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Rol</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 8 }}>{u.username}</td>
                <td style={{ padding: 8 }}>{u.displayName}</td>
                <td style={{ padding: 8 }}>{u.role === 'root' ? '⭐ root' : u.role}</td>
                <td style={{ padding: 8 }}>
                  {u.role !== 'root' && (
                    <>
                      {selectedUser === u.id ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as any)}
                            style={{ padding: 4 }}
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                          <button onClick={() => changeRole(u.id, selectedRole)} style={{ padding: '4px 8px' }}>
                            Aplicar
                          </button>
                          <button onClick={() => setSelectedUser(null)} style={{ padding: '4px 8px' }}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedUser(u.id)
                            setSelectedRole(u.role === 'user' ? 'admin' : 'user')
                          }}
                          style={{ padding: '4px 8px' }}
                        >
                          Cambiar rol
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {msg && <p style={{ marginTop: '1rem', color: msg.includes('Error') ? 'crimson' : 'green' }}>{msg}</p>}
    </main>
  )
}
