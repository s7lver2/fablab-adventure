'use client'
import { useEffect, useState } from 'react'

interface SettingsData {
  maintenance: boolean
  seedVersion: string
  appeals: {
    maxPendingPerChallenge: number
    maxPendingGlobal: number
    cooldownHours: number
  }
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null)
  const [maintenance, setMaintenance] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setMaintenance(d.maintenance)
      })
  }, [])

  async function handleToggleMaintenance() {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenance: !maintenance }),
      })
      if (!res.ok) {
        const json = await res.json()
        setMessage(`Error: ${json.error || 'No se pudo guardar'}`)
        return
      }
      setMaintenance(!maintenance)
      setMessage('Guardado correctamente')
    } finally {
      setSaving(false)
    }
  }

  const section = (title: string, children: React.ReactNode) => (
    <div style={{ border: '1px solid var(--adm-border)', borderRadius: 'var(--adm-radius)', overflow: 'hidden', marginBottom: '1rem' }}>
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--adm-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--adm-text-primary)' }}>{title}</span>
      </div>
      <div style={{ padding: '1rem' }}>
        {children}
      </div>
    </div>
  )

  if (!data) return <div style={{ padding: '1.25rem' }}>Cargando...</div>

  return (
    <div style={{ padding: '1.25rem', maxWidth: 800 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
          ajustes
        </div>
        <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--adm-text-primary)' }}>
          Ajustes de la plataforma
        </div>
      </div>

      {/* Section 1: Seed Version */}
      {section('Versión de siembra', (
        <div>
          <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 12, color: 'var(--adm-text-secondary)', marginBottom: 8 }}>
            seed_version
          </div>
          <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 13, color: 'var(--adm-text-primary)', background: 'var(--adm-bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--adm-radius-sm)' }}>
            {data.seedVersion}
          </div>
        </div>
      ))}

      {/* Section 2: Maintenance Toggle */}
      {section('Modo mantenimiento', (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 12, color: 'var(--adm-text-secondary)', marginBottom: 4 }}>
                Estado actual
              </div>
              <div style={{
                fontFamily: 'var(--adm-font-mono)',
                fontSize: 13,
                fontWeight: 500,
                color: maintenance ? 'var(--adm-error)' : 'var(--adm-success)',
              }}>
                {maintenance ? '🟠 ACTIVO — Desactivar' : '🟢 INACTIVO — Activar'}
              </div>
            </div>
            <button
              onClick={handleToggleMaintenance}
              disabled={saving}
              style={{
                background: maintenance ? 'var(--adm-success)' : 'var(--adm-error)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--adm-radius-sm)',
                padding: '0.5rem 1rem',
                fontSize: 12,
                fontFamily: 'var(--adm-font-mono)',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
                fontWeight: 500,
              }}
            >
              {saving ? 'Guardando...' : (maintenance ? 'Desactivar' : 'Activar')}
            </button>
          </div>
          {message && (
            <div style={{
              fontFamily: 'var(--adm-font-mono)',
              fontSize: 11,
              color: message.startsWith('Error') ? 'var(--adm-error)' : 'var(--adm-success)',
              background: message.startsWith('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--adm-radius-sm)',
              marginTop: '0.75rem',
            }}>
              {message}
            </div>
          )}
        </div>
      ))}

      {/* Section 3: Appeals Config (Read-Only) */}
      {section('Configuración de apelaciones', (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div>
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-text-secondary)', marginBottom: 6 }}>
              Máx. pendientes por reto
            </div>
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 16, fontWeight: 500, color: 'var(--adm-text-primary)' }}>
              {data.appeals.maxPendingPerChallenge}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-text-secondary)', marginBottom: 6 }}>
              Máx. pendientes globales
            </div>
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 16, fontWeight: 500, color: 'var(--adm-text-primary)' }}>
              {data.appeals.maxPendingGlobal}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-text-secondary)', marginBottom: 6 }}>
              Cooldown (horas)
            </div>
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 16, fontWeight: 500, color: 'var(--adm-text-primary)' }}>
              {data.appeals.cooldownHours}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
