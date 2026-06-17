'use client'
import { useEffect, useState } from 'react'

interface AnalyticsData {
  summary: {
    totalEvents: number
    sessions: number
    activeUsers: number
    bounceSessions: number
    avgSessionMs: number
    byHour: number[]
  }
  devices: Record<string, number>
  browsers: Record<string, number>
  stuck: Array<{ challengeId: number; challengeTitle: string; current: number; avgAttempts: number }>
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: '1rem' }}>Cargando analítica...</div>
  if (!data) return <div style={{ padding: '1rem' }}>Error al cargar datos.</div>

  const { summary, devices, browsers, stuck } = data
  const bouncePct = summary.sessions > 0 ? Math.round((summary.bounceSessions / summary.sessions) * 100) : 0
  const avgMinutes = Math.round(summary.avgSessionMs / 1000 / 60)

  const maxHour = Math.max(...summary.byHour, 1)
  const barHeight = 10 // líneas de gráfico

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1>Analítica</h1>

      {/* Tarjetas de resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <Card title="Eventos totales" value={summary.totalEvents} />
        <Card title="Sesiones" value={summary.sessions} />
        <Card title="Usuarios activos" value={summary.activeUsers} />
        <Card title="Rebote" value={`${bouncePct}%`} />
        <Card title="Duración media" value={`${avgMinutes} min`} />
      </div>

      {/* Gráfico de actividad por hora */}
      <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
        <h2>Actividad por hora (UTC)</h2>
        {summary.byHour.map((count, hour) => {
          const barWidth = Math.max(1, Math.round((count / maxHour) * 50))
          return (
            <div key={hour} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', fontFamily: 'monospace', fontSize: '0.9rem' }}>
              <div style={{ width: '3rem', textAlign: 'right' }}>{String(hour).padStart(2, '0')}:00</div>
              <div style={{ height: '20px', width: `${barWidth}px`, backgroundColor: '#4a9eff', borderRadius: '2px' }} />
              <div>{count}</div>
            </div>
          )
        })}
      </div>

      {/* Tabla de dispositivos y navegadores */}
      <div style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
          <h2>Dispositivos</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {Object.entries(devices).sort(([, a], [, b]) => b - a).map(([device, count]) => (
                <tr key={device}>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{device}</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', textAlign: 'right' }}>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
          <h2>Navegadores</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {Object.entries(browsers).sort(([, a], [, b]) => b - a).map(([browser, count]) => (
                <tr key={browser}>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{browser}</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', textAlign: 'right' }}>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla de "dónde se atascan" */}
      <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
        <h2>Dónde se atascan los alumnos</h2>
        {stuck.length === 0 ? (
          <p>No hay datos de progreso aún.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '0.5rem', textAlign: 'left' }}>Reto</th>
                <th style={{ padding: '0.5rem', textAlign: 'center' }}>Atascos</th>
                <th style={{ padding: '0.5rem', textAlign: 'center' }}>Intentos (media)</th>
              </tr>
            </thead>
            <tbody>
              {stuck.sort((a, b) => b.current - a.current).map((s) => (
                <tr key={s.challengeId} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.5rem' }}>{s.challengeTitle}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>{s.current}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>{s.avgAttempts.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' }}>
      <div style={{ fontSize: '0.9rem', color: '#666' }}>{title}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.5rem' }}>{value}</div>
    </div>
  )
}
