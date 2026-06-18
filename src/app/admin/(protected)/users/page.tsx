'use client'
import { useEffect, useState } from 'react'

interface UserRow { id: number; username: string; displayName: string; role: string; createdAt: number }

const TH: React.CSSProperties = { padding: '0.5rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', textAlign: 'left', letterSpacing: '0.06em', borderBottom: '0.5px solid var(--color-border-tertiary)' }
const TD: React.CSSProperties = { padding: '0.5rem 1rem', fontSize: 12, borderBottom: '0.5px solid var(--color-border-tertiary)' }

function roleBadge(role: string) {
  const color = role === 'root' ? 'var(--color-text-warning)' : role === 'admin' ? 'var(--color-text-info)' : 'var(--color-text-secondary)'
  const bg = role === 'root' ? 'var(--color-background-warning)' : role === 'admin' ? 'var(--color-background-info)' : 'var(--color-background-secondary)'
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color, background: bg, padding: '2px 6px', borderRadius: 99 }}>
      {role}
    </span>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ username: '', displayName: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const reload = () => fetch('/api/admin/users').then((r) => r.json()).then(setUsers)
  useEffect(() => { reload() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Error'); return }
    setForm({ username: '', displayName: '', password: '' }); setShowForm(false); reload()
  }

  async function changeRole(userId: number, role: string) {
    await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, role }) })
    reload()
  }

  const input: React.CSSProperties = { background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', padding: '0.4rem 0.6rem', fontSize: 12, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', outline: 'none', width: '100%' }

  return (
    <div style={{ padding: '1.25rem' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>gestión</div>
          <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)' }}>Alumnos y admins</div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: 'var(--color-background-success)', color: 'var(--color-text-success)', border: 'none', borderRadius: 'var(--border-radius-md)', padding: '0.4rem 0.875rem', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
          + nuevo admin
        </button>
      </div>

      {showForm && (
        <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>Crear admin</div>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 4 }}>USUARIO</div>
              <input style={input} value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="admin2" required />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 4 }}>NOMBRE</div>
              <input style={input} value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} placeholder="Nombre Admin" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 4 }}>CONTRASEÑA</div>
              <input style={input} type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
            </div>
            <button type="submit" disabled={loading} style={{ background: 'var(--color-background-success)', color: 'var(--color-text-success)', border: 'none', borderRadius: 'var(--border-radius-md)', padding: '0.4rem 0.875rem', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
              {loading ? '…' : 'Crear'}
            </button>
          </form>
          {error && <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-danger)' }}>{error}</div>}
        </div>
      )}

      <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Usuarios</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)' }}>{users.length} total</span>
        </div>
        {users.length === 0 && <div style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>Sin usuarios</div>}
        {users.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['USUARIO', 'NOMBRE', 'ROL', 'CAMBIAR ROL'].map((h) => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-primary)' }}>{u.username}</td>
                  <td style={{ ...TD, color: 'var(--color-text-secondary)' }}>{u.displayName || '—'}</td>
                  <td style={TD}>{roleBadge(u.role)}</td>
                  <td style={TD}>
                    {u.role !== 'root' && (
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value)}
                        style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', padding: '2px 6px', fontSize: 11, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', cursor: 'pointer' }}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
