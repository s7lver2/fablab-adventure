'use client'
import { useEffect, useState } from 'react'

interface UserRow { id: number; username: string; displayName: string; role: string; createdAt: number }

const ROLES = ['user', 'admin', 'root'] as const
type Role = typeof ROLES[number]

const ROLE_COLOR: Record<string, string> = {
  root: '#f59e0b',
  admin: '#6366f1',
  user: 'var(--adm-text-secondary)',
}
const ROLE_BG: Record<string, string> = {
  root: 'rgba(245,158,11,0.12)',
  admin: 'rgba(99,102,241,0.12)',
  user: 'var(--adm-bg-secondary)',
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span style={{
      fontFamily: 'var(--adm-font-mono)', fontSize: 10,
      color: ROLE_COLOR[role] ?? 'var(--adm-text-secondary)',
      background: ROLE_BG[role] ?? 'var(--adm-bg-secondary)',
      padding: '3px 8px', borderRadius: 99,
    }}>
      {role}
    </span>
  )
}

function Avatar({ name }: { name: string }) {
  const initials = name.slice(0, 2).toUpperCase()
  const hue = (name.charCodeAt(0) * 37 + name.charCodeAt(1) * 13) % 360
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue},45%,35%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--adm-font-mono)', fontSize: 11, fontWeight: 600, color: '#fff',
    }}>
      {initials}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'var(--adm-bg-secondary)',
  border: '1px solid var(--adm-border)',
  borderRadius: 'var(--adm-radius-sm)',
  padding: '0.4rem 0.6rem',
  fontSize: 12,
  color: 'var(--adm-text-primary)',
  fontFamily: 'var(--adm-font-mono)',
  outline: 'none',
  width: '100%',
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ username: '', displayName: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

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

  const filtered = users.filter((u) =>
    !search || u.username.includes(search) || (u.displayName ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const admins = users.filter((u) => u.role === 'admin' || u.role === 'root').length
  const regular = users.filter((u) => u.role === 'user').length

  return (
    <div style={{ padding: '1.25rem', height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>GESTIÓN</div>
          <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--adm-text-primary)' }}>Alumnos</div>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError('') }}
          style={{
            background: showForm ? 'var(--adm-bg-secondary)' : 'var(--adm-success)',
            color: showForm ? 'var(--adm-text-secondary)' : '#fff',
            border: `1px solid ${showForm ? 'var(--adm-border)' : 'transparent'}`,
            borderRadius: 'var(--adm-radius-sm)', padding: '0.4rem 0.875rem',
            fontSize: 12, fontFamily: 'var(--adm-font-mono)', cursor: 'pointer',
          }}
        >
          {showForm ? '✕ cancelar' : '+ nuevo admin'}
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, flexShrink: 0 }}>
        {[
          { label: 'TOTAL', value: users.length, sub: 'usuarios registrados' },
          { label: 'ALUMNOS', value: regular, sub: 'con rol user' },
          { label: 'ADMINS', value: admins, sub: 'root + admin' },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: 'var(--adm-panel)', border: '0.5px solid var(--adm-border)', borderRadius: 'var(--adm-radius)', padding: '0.75rem 1rem' }}>
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 9, color: 'var(--adm-label)', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--adm-text-primary)', marginBottom: 2 }}>{value}</div>
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-tertiary)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Create admin form */}
      {showForm && (
        <div style={{ background: 'var(--adm-panel)', border: '1px solid var(--adm-border)', borderRadius: 'var(--adm-radius)', padding: '1rem', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-text-secondary)', marginBottom: '0.75rem', letterSpacing: '0.06em' }}>CREAR ADMIN</div>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
            <div>
              <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-tertiary)', marginBottom: 4 }}>USUARIO</div>
              <input style={inputStyle} value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="admin2" required />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-tertiary)', marginBottom: 4 }}>NOMBRE</div>
              <input style={inputStyle} value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} placeholder="Nombre" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-tertiary)', marginBottom: 4 }}>CONTRASEÑA</div>
              <input style={inputStyle} type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
            </div>
            <button type="submit" disabled={loading} style={{ background: 'var(--adm-success)', color: '#fff', border: 'none', borderRadius: 'var(--adm-radius-sm)', padding: '0.4rem 0.875rem', fontSize: 12, fontFamily: 'var(--adm-font-mono)', cursor: 'pointer', height: 30 }}>
              {loading ? '…' : 'Crear'}
            </button>
          </form>
          {error && <div style={{ marginTop: 8, fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-error)' }}>{error}</div>}
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--adm-panel)', border: '0.5px solid var(--adm-border)', borderRadius: 'var(--adm-radius)', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Table header row */}
        <div style={{ padding: '0.6rem 1rem', borderBottom: '0.5px solid var(--adm-border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--adm-text-primary)', flex: 1 }}>{filtered.length} usuarios</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar…"
            style={{ ...inputStyle, width: 180, padding: '0.3rem 0.6rem' }}
          />
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '1.5rem', fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-text-tertiary)', textAlign: 'center' }}>
              Sin resultados
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--adm-bg-secondary)', zIndex: 1 }}>
                <tr>
                  {['USUARIO', 'NOMBRE', 'ROL', 'REGISTRADO', 'CAMBIAR ROL'].map((h) => (
                    <th key={h} style={{ padding: '0.45rem 1rem', fontFamily: 'var(--adm-font-mono)', fontSize: 9, color: 'var(--adm-text-tertiary)', textAlign: 'left', letterSpacing: '0.08em', borderBottom: '0.5px solid var(--adm-border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '0.5px solid var(--adm-border)' }}>
                    <td style={{ padding: '0.55rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={u.username} />
                        <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-text-primary)' }}>{u.username}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.55rem 1rem', fontSize: 12, color: 'var(--adm-text-secondary)' }}>{u.displayName || '—'}</td>
                    <td style={{ padding: '0.55rem 1rem' }}><RoleBadge role={u.role} /></td>
                    <td style={{ padding: '0.55rem 1rem', fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-tertiary)' }}>
                      {new Date(u.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                    <td style={{ padding: '0.55rem 1rem' }}>
                      {u.role !== 'root' ? (
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                          style={{ background: 'var(--adm-bg-secondary)', border: '1px solid var(--adm-border)', borderRadius: 'var(--adm-radius-sm)', padding: '3px 6px', fontSize: 11, color: 'var(--adm-text-primary)', fontFamily: 'var(--adm-font-mono)', cursor: 'pointer' }}
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      ) : (
                        <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-tertiary)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
