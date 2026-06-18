'use client'
import { useEffect, useState } from 'react'

interface AuditEntry { id: number; timestamp: number; adminUsername: string; type: string; meta: Record<string, unknown> }

function fmtTs(ms: number) {
  return new Date(ms).toLocaleString('es', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function typeLabel(type: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    'admin:user_create':     { label: 'nuevo admin',    color: '#fff',              bg: 'var(--adm-accent)' },
    'admin:role_change':     { label: 'cambio de rol',  color: '#fff',              bg: 'var(--adm-warning)' },
    'admin:appeal_accept':   { label: 'apelación ✓',    color: '#fff',              bg: 'var(--adm-success)' },
    'admin:appeal_reject':   { label: 'apelación ✗',    color: '#fff',              bg: 'var(--adm-error)' },
    'admin:maintenance_on':  { label: 'mantenimiento ↑', color: '#fff',             bg: 'var(--adm-warning)' },
    'admin:maintenance_off': { label: 'mantenimiento ↓', color: '#fff',             bg: 'var(--adm-success)' },
  }
  const t = map[type] ?? { label: type, color: 'var(--adm-text-secondary)', bg: 'var(--adm-bg-secondary)' }
  return <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: t.color, background: t.bg, padding: '2px 6px', borderRadius: 99 }}>{t.label}</span>
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])

  useEffect(() => {
    fetch('/api/admin/audit').then((r) => r.json()).then(setEntries)
  }, [])

  const TH: React.CSSProperties = { padding: '0.5rem 1rem', fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-secondary)', textAlign: 'left', letterSpacing: '0.06em', borderBottom: '1px solid var(--adm-border)' }
  const TD: React.CSSProperties = { padding: '0.55rem 1rem', fontSize: 12, borderBottom: '1px solid var(--adm-border)' }

  return (
    <div style={{ padding: '1.25rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>auditoría</div>
        <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--adm-text-primary)' }}>Auditoría</div>
      </div>

      <div style={{ border: '1px solid var(--adm-border)', borderRadius: 'var(--adm-radius)', overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--adm-border)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--adm-text-primary)' }}>Acciones de administradores</span>
          <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-secondary)' }}>últimas 100</span>
        </div>

        {entries.length === 0 && <div style={{ padding: '1rem', fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-text-secondary)' }}>Sin acciones registradas aún</div>}

        {entries.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['FECHA', 'ADMIN', 'ACCIÓN', 'DETALLE'].map((h) => <th key={h} style={TH}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td style={{ ...TD, fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-secondary)' }}>{fmtTs(e.timestamp)}</td>
                  <td style={{ ...TD, fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-text-primary)' }}>{e.adminUsername}</td>
                  <td style={TD}>{typeLabel(e.type)}</td>
                  <td style={{ ...TD, fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-secondary)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {Object.entries(e.meta).map(([k, v]) => `${k}: ${v}`).join(', ') || '—'}
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
