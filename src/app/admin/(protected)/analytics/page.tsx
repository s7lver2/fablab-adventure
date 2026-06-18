'use client'
import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import { chartTheme, INDIGO, INDIGO_RAMP, chartAnim } from '../components/adminUi'

interface Summary { totalEvents: number; sessions: number; activeUsers: number; bounceSessions: number; avgSessionMs: number; byHour: number[] }
interface StuckRow { challengeId: number; challengeTitle: string; current: number }
interface AnalyticsData { summary: Summary; devices: Record<string, number>; browsers: Record<string, number>; stuck: StuckRow[] }

function sec(children: React.ReactNode) {
  return <div style={{ border: '1px solid var(--adm-border)', borderRadius: 'var(--adm-radius)', overflow: 'hidden' }}>{children}</div>
}

function sh(title: string, sub?: string) {
  return (
    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--adm-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--adm-text-primary)' }}>{title}</span>
      {sub && <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-tertiary)' }}>{sub}</span>}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const hourlyRef = useRef<HTMLCanvasElement>(null)
  const conceptsRef = useRef<HTMLCanvasElement>(null)
  const hourlyChart = useRef<Chart | null>(null)
  const conceptsChart = useRef<Chart | null>(null)

  useEffect(() => {
    fetch('/api/admin/analytics').then((r) => r.json()).then(setData)
  }, [])

  useEffect(() => {
    if (!data || !hourlyRef.current || !conceptsRef.current) return
    hourlyChart.current?.destroy()
    conceptsChart.current?.destroy()

    const theme = chartTheme()
    const scale = { grid: { color: theme.gridColor }, border: { display: false as const }, ticks: { color: theme.textColor, font: { family: 'monospace', size: 10 } } }

    hourlyChart.current = new Chart(hourlyRef.current.getContext('2d')!, {
      type: 'bar',
      data: {
        labels: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')),
        datasets: [{ data: data.summary.byHour, backgroundColor: INDIGO, borderRadius: 4, borderWidth: 0 }],
      },
      options: { animation: chartAnim(), plugins: { legend: { display: false } }, scales: { x: scale, y: scale } },
    })

    conceptsChart.current = new Chart(conceptsRef.current.getContext('2d')!, {
      type: 'bar',
      data: {
        labels: ['Fundamentos', 'Condicionales', 'Bucles', 'Funciones'],
        datasets: [{ data: [5, 4, 4, 3], backgroundColor: INDIGO_RAMP.slice(0, 4), borderRadius: 4, borderWidth: 0 }],
      },
      options: { animation: chartAnim(), indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: scale, y: scale } },
    })

    return () => { hourlyChart.current?.destroy(); conceptsChart.current?.destroy() }
  }, [data])

  // Listen for theme change events to reinitialize charts
  useEffect(() => {
    const handleThemeChange = () => {
      hourlyChart.current?.destroy()
      conceptsChart.current?.destroy()
      hourlyChart.current = null
      conceptsChart.current = null
      // Trigger chart reinitialization
      if (data) {
        const theme = chartTheme()
        const scale = { grid: { color: theme.gridColor }, border: { display: false as const }, ticks: { color: theme.textColor, font: { family: 'monospace', size: 10 } } }

        if (hourlyRef.current) {
          hourlyChart.current = new Chart(hourlyRef.current.getContext('2d')!, {
            type: 'bar',
            data: {
              labels: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')),
              datasets: [{ data: data.summary.byHour, backgroundColor: INDIGO, borderRadius: 4, borderWidth: 0 }],
            },
            options: { animation: chartAnim(), plugins: { legend: { display: false } }, scales: { x: scale, y: scale } },
          })
        }

        if (conceptsRef.current) {
          conceptsChart.current = new Chart(conceptsRef.current.getContext('2d')!, {
            type: 'bar',
            data: {
              labels: ['Fundamentos', 'Condicionales', 'Bucles', 'Funciones'],
              datasets: [{ data: [5, 4, 4, 3], backgroundColor: INDIGO_RAMP.slice(0, 4), borderRadius: 4, borderWidth: 0 }],
            },
            options: { animation: chartAnim(), indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: scale, y: scale } },
          })
        }
      }
    }

    window.addEventListener('adm-theme-change', handleThemeChange)
    return () => window.removeEventListener('adm-theme-change', handleThemeChange)
  }, [data])

  if (!data) return <div style={{ padding: '1.25rem', fontFamily: 'var(--adm-font-mono)', fontSize: 12, color: 'var(--adm-text-secondary)' }}>Cargando…</div>

  const bouncePct = data.summary.sessions > 0 ? Math.round((data.summary.bounceSessions / data.summary.sessions) * 100) : 0
  const avgMin = Math.round(data.summary.avgSessionMs / 60_000)

  return (
    <div style={{ padding: '1.25rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>análisis</div>
        <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--adm-text-primary)' }}>Analítica</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8, marginBottom: '1rem' }}>
        {[
          { label: 'eventos totales', value: data.summary.totalEvents },
          { label: 'sesiones únicas', value: data.summary.sessions },
          { label: 'tasa de rebote', value: `${bouncePct}%` },
          { label: 'duración media', value: `${avgMin} min` },
        ].map((k) => (
          <div key={k.label} style={{ background: 'var(--adm-bg-secondary)', borderRadius: 'var(--adm-radius-sm)', padding: '0.875rem' }}>
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-tertiary)', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--adm-text-primary)' }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 8 }}>
        {sec(<>{sh('Actividad por hora del día (UTC)', 'hoy')}<div style={{ padding: '0.75rem' }}><canvas ref={hourlyRef} height={130}></canvas></div></>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        {sec(<>{sh('Retos por concepto')}<div style={{ padding: '0.75rem' }}><canvas ref={conceptsRef} height={140}></canvas></div></>)}
        {sec(<>
          {sh('Dónde se atascan')}
          {data.stuck.length === 0 && <div style={{ padding: '0.75rem 1rem', fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-text-secondary)' }}>Sin datos de progreso aún</div>}
          {data.stuck.sort((a, b) => b.current - a.current).slice(0, 5).map((s) => (
            <div key={s.challengeId} style={{ padding: '0.55rem 1rem', borderBottom: '1px solid var(--adm-border)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
              <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-success)', flex: 1 }}>{s.challengeTitle}</span>
              <div style={{ width: 70, height: 3, background: 'var(--adm-border)', borderRadius: 99 }}>
                <div style={{ width: `${Math.min(100, s.current * 10)}%`, height: '100%', background: 'var(--adm-error)', borderRadius: 99 }} />
              </div>
              <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-secondary)', minWidth: 20, textAlign: 'right' }}>{s.current}</span>
            </div>
          ))}
        </>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {(['Dispositivos', 'Navegadores'] as const).map((title) => {
          const d = title === 'Dispositivos' ? data.devices : data.browsers
          return (
            <div key={title} style={{ border: '1px solid var(--adm-border)', borderRadius: 'var(--adm-radius)', overflow: 'hidden' }}>
              {sh(title)}
              {Object.entries(d).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, count]) => (
                <div key={name} style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--adm-border)', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--adm-text-primary)' }}>{name || '—'}</span>
                  <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-text-secondary)' }}>{count}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
