'use client'
import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import { chartTheme } from '../components/adminUi'

interface SessionRow {
  sessionId: string
  username: string
  startedAt: number
  durationMs: number
  eventCount: number
  device: string
  browser: string
}

interface SessionsData {
  summary: { today: number; avgDurationMs: number; bounceRate: number }
  sessions: SessionRow[]
}

function sec(children: React.ReactNode) {
  return (
    <div
      style={{
        border: '1px solid var(--adm-border)',
        borderRadius: 'var(--adm-radius)',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  )
}

function sh(title: string, sub?: string) {
  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderBottom: '1px solid var(--adm-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--adm-text-primary)' }}>
        {title}
      </span>
      {sub && (
        <span
          style={{
            fontFamily: 'var(--adm-font-mono)',
            fontSize: 10,
            color: 'var(--adm-text-tertiary)',
          }}
        >
          {sub}
        </span>
      )}
    </div>
  )
}

function KPI({
  label,
  value,
  delta,
  danger,
}: {
  label: string
  value: React.ReactNode
  delta?: string
  danger?: boolean
}) {
  return (
    <div
      style={{
        background: 'var(--adm-bg-secondary)',
        borderRadius: 'var(--adm-radius-sm)',
        padding: '0.875rem',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--adm-font-mono)',
          fontSize: 10,
          color: 'var(--adm-text-tertiary)',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--adm-font-mono)',
          fontSize: 20,
          fontWeight: 500,
          color: danger ? 'var(--adm-error)' : 'var(--adm-text-primary)',
          marginBottom: 3,
        }}
      >
        {value}
      </div>
      {delta && (
        <div
          style={{
            fontFamily: 'var(--adm-font-mono)',
            fontSize: 10,
            color: danger ? 'var(--adm-error)' : 'var(--adm-success)',
          }}
        >
          {delta}
        </div>
      )}
    </div>
  )
}

export default function SessionsPage() {
  const [data, setData] = useState<SessionsData | null>(null)
  const durationRef = useRef<HTMLCanvasElement>(null)
  const durationChart = useRef<Chart | null>(null)

  useEffect(() => {
    fetch('/api/admin/sessions')
      .then((r) => r.json())
      .then(setData)
  }, [])

  useEffect(() => {
    if (!data || !durationRef.current) return
    durationChart.current?.destroy()

    const theme = chartTheme()
    const scale = {
      grid: { color: theme.gridColor },
      border: { display: false as const },
      ticks: { color: theme.textColor, font: { family: 'monospace', size: 10 } },
    }

    // Group sessions by duration buckets
    const buckets = [
      { label: '< 1 min', max: 60000 },
      { label: '1–5 min', max: 300000 },
      { label: '5–15 min', max: 900000 },
      { label: '> 15 min', max: Infinity },
    ]

    const counts = buckets.map((b) =>
      data.sessions.filter((s) => s.durationMs < b.max && s.durationMs >= (buckets[buckets.indexOf(b) - 1]?.max ?? 0)).length
    )

    durationChart.current = new Chart(durationRef.current.getContext('2d')!, {
      type: 'bar',
      data: {
        labels: buckets.map((b) => b.label),
        datasets: [
          {
            data: counts,
            backgroundColor: '#10b981',
            borderRadius: 2,
            borderWidth: 0,
          },
        ],
      },
      options: {
        animation: false,
        plugins: { legend: { display: false } },
        scales: { x: scale, y: scale },
      },
    })

    return () => {
      durationChart.current?.destroy()
    }
  }, [data])

  // Listen for theme change events to reinitialize chart
  useEffect(() => {
    const handleThemeChange = () => {
      durationChart.current?.destroy()
      durationChart.current = null
      // Trigger chart reinitialization
      if (data && durationRef.current) {
        const theme = chartTheme()
        const scale = {
          grid: { color: theme.gridColor },
          border: { display: false as const },
          ticks: { color: theme.textColor, font: { family: 'monospace', size: 10 } },
        }

        const buckets = [
          { label: '< 1 min', max: 60000 },
          { label: '1–5 min', max: 300000 },
          { label: '5–15 min', max: 900000 },
          { label: '> 15 min', max: Infinity },
        ]

        const counts = buckets.map((b) =>
          data.sessions.filter((s) => s.durationMs < b.max && s.durationMs >= (buckets[buckets.indexOf(b) - 1]?.max ?? 0)).length
        )

        durationChart.current = new Chart(durationRef.current.getContext('2d')!, {
          type: 'bar',
          data: {
            labels: buckets.map((b) => b.label),
            datasets: [
              {
                data: counts,
                backgroundColor: '#10b981',
                borderRadius: 2,
                borderWidth: 0,
              },
            ],
          },
          options: {
            animation: false,
            plugins: { legend: { display: false } },
            scales: { x: scale, y: scale },
          },
        })
      }
    }

    window.addEventListener('adm-theme-change', handleThemeChange)
    return () => window.removeEventListener('adm-theme-change', handleThemeChange)
  }, [data])

  if (!data) {
    return (
      <div
        style={{
          padding: '1.25rem',
          fontFamily: 'var(--adm-font-mono)',
          fontSize: 12,
          color: 'var(--adm-text-secondary)',
        }}
      >
        Cargando…
      </div>
    )
  }

  const avgMin = Math.round(data.summary.avgDurationMs / 60000)

  return (
    <div style={{ padding: '1.25rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div
          style={{
            fontFamily: 'var(--adm-font-mono)',
            fontSize: 10,
            color: 'var(--adm-text-tertiary)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 3,
          }}
        >
          sesiones
        </div>
        <div
          style={{
            fontSize: 17,
            fontWeight: 500,
            color: 'var(--adm-text-primary)',
          }}
        >
          Detalles de sesiones
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, marginBottom: '1rem' }}>
        <KPI label="let hoySesiones" value={data.summary.today} delta="sesiones únicas" />
        <KPI label="let avgDuration" value={`${avgMin} min`} delta="duración media" />
        <KPI label="let bounceRate" value={`${data.summary.bounceRate}%`} delta="tasa de rebote" danger={data.summary.bounceRate > 50} />
      </div>

      <div style={{ marginBottom: 8 }}>
        {sec(
          <>
            {sh('Distribución de duración de sesiones', 'sesiones')}
            <div style={{ padding: '0.75rem' }}>
              <canvas ref={durationRef} height={130}></canvas>
            </div>
          </>
        )}
      </div>

      {sec(
        <>
          {sh('Sesiones de hoy', `${data.sessions.length} sesiones`)}
          {data.sessions.length === 0 && (
            <div
              style={{
                padding: '0.75rem 1rem',
                fontFamily: 'var(--adm-font-mono)',
                fontSize: 11,
                color: 'var(--adm-text-secondary)',
              }}
            >
              Sin sesiones aún
            </div>
          )}
          {data.sessions.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  fontSize: 12,
                  borderCollapse: 'collapse',
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--adm-border)',
                      backgroundColor: 'var(--adm-bg-secondary)',
                    }}
                  >
                    <th
                      style={{
                        padding: '0.65rem 1rem',
                        textAlign: 'left',
                        fontWeight: 600,
                        fontSize: 11,
                        color: 'var(--adm-text-tertiary)',
                        fontFamily: 'var(--adm-font-mono)',
                      }}
                    >
                      ALUMNO
                    </th>
                    <th
                      style={{
                        padding: '0.65rem 1rem',
                        textAlign: 'left',
                        fontWeight: 600,
                        fontSize: 11,
                        color: 'var(--adm-text-tertiary)',
                        fontFamily: 'var(--adm-font-mono)',
                      }}
                    >
                      INICIO
                    </th>
                    <th
                      style={{
                        padding: '0.65rem 1rem',
                        textAlign: 'left',
                        fontWeight: 600,
                        fontSize: 11,
                        color: 'var(--adm-text-tertiary)',
                        fontFamily: 'var(--adm-font-mono)',
                      }}
                    >
                      DURACIÓN
                    </th>
                    <th
                      style={{
                        padding: '0.65rem 1rem',
                        textAlign: 'left',
                        fontWeight: 600,
                        fontSize: 11,
                        color: 'var(--adm-text-tertiary)',
                        fontFamily: 'var(--adm-font-mono)',
                      }}
                    >
                      EVENTOS
                    </th>
                    <th
                      style={{
                        padding: '0.65rem 1rem',
                        textAlign: 'left',
                        fontWeight: 600,
                        fontSize: 11,
                        color: 'var(--adm-text-tertiary)',
                        fontFamily: 'var(--adm-font-mono)',
                      }}
                    >
                      DISPOSITIVO
                    </th>
                    <th
                      style={{
                        padding: '0.65rem 1rem',
                        textAlign: 'left',
                        fontWeight: 600,
                        fontSize: 11,
                        color: 'var(--adm-text-tertiary)',
                        fontFamily: 'var(--adm-font-mono)',
                      }}
                    >
                      NAVEGADOR
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.sessions.map((s) => (
                    <tr
                      key={s.sessionId}
                      style={{
                        borderBottom: '1px solid var(--adm-border)',
                      }}
                    >
                      <td
                        style={{
                          padding: '0.65rem 1rem',
                          color: 'var(--adm-text-primary)',
                        }}
                      >
                        {s.username}
                      </td>
                      <td
                        style={{
                          padding: '0.65rem 1rem',
                          color: 'var(--adm-text-secondary)',
                          fontFamily: 'var(--adm-font-mono)',
                          fontSize: 11,
                        }}
                      >
                        {new Date(s.startedAt).toLocaleTimeString('es-ES')}
                      </td>
                      <td
                        style={{
                          padding: '0.65rem 1rem',
                          color: 'var(--adm-text-primary)',
                          fontFamily: 'var(--adm-font-mono)',
                        }}
                      >
                        {Math.round(s.durationMs / 1000)}s
                      </td>
                      <td
                        style={{
                          padding: '0.65rem 1rem',
                          color: 'var(--adm-text-primary)',
                          fontFamily: 'var(--adm-font-mono)',
                        }}
                      >
                        {s.eventCount}
                      </td>
                      <td
                        style={{
                          padding: '0.65rem 1rem',
                          color: 'var(--adm-text-secondary)',
                        }}
                      >
                        {s.device || '—'}
                      </td>
                      <td
                        style={{
                          padding: '0.65rem 1rem',
                          color: 'var(--adm-text-secondary)',
                        }}
                      >
                        {s.browser || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
