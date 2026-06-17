'use client'
import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'

interface Summary { totalEvents: number; sessions: number; activeUsers: number; bounceSessions: number; avgSessionMs: number; byHour: number[] }
interface StuckRow { challengeId: number; challengeTitle: string; current: number }
interface AnalyticsData { summary: Summary; devices: Record<string, number>; browsers: Record<string, number>; stuck: StuckRow[] }

function sec(children: React.ReactNode) {
  return <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>{children}</div>
}

function sh(title: string, sub?: string) {
  return (
    <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{title}</span>
      {sub && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)' }}>{sub}</span>}
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

    const style = getComputedStyle(document.documentElement)
    const grd = style.getPropertyValue('--color-border-tertiary').trim()
    const txt = style.getPropertyValue('--color-text-secondary').trim()
    const scale = { grid: { color: grd }, border: { display: false as const }, ticks: { color: txt, font: { family: 'monospace', size: 10 } } }

    hourlyChart.current = new Chart(hourlyRef.current.getContext('2d')!, {
      type: 'bar',
      data: {
        labels: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')),
        datasets: [{ data: data.summary.byHour, backgroundColor: '#1D9E75', borderRadius: 2, borderWidth: 0 }],
      },
      options: { animation: false, plugins: { legend: { display: false } }, scales: { x: scale, y: scale } },
    })

    conceptsChart.current = new Chart(conceptsRef.current.getContext('2d')!, {
      type: 'bar',
      data: {
        labels: ['Fundamentos', 'Condicionales', 'Bucles', 'Funciones'],
        datasets: [{ data: [5, 4, 4, 3], backgroundColor: ['#1D9E75', '#185FA5', '#BA7517', '#A32D2D'], borderRadius: 3, borderWidth: 0 }],
      },
      options: { animation: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: scale, y: scale } },
    })

    return () => { hourlyChart.current?.destroy(); conceptsChart.current?.destroy() }
  }, [data])

  if (!data) return <div style={{ padding: '1.25rem', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-secondary)' }}>Cargando…</div>

  const bouncePct = data.summary.sessions > 0 ? Math.round((data.summary.bounceSessions / data.summary.sessions) * 100) : 0
  const avgMin = Math.round(data.summary.avgSessionMs / 60_000)

  return (
    <div style={{ padding: '1.25rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>métricas</div>
        <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)' }}>Analítica</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8, marginBottom: '1rem' }}>
        {[
          { label: 'eventos totales', value: data.summary.totalEvents },
          { label: 'sesiones únicas', value: data.summary.sessions },
          { label: 'tasa de rebote', value: `${bouncePct}%` },
          { label: 'duración media', value: `${avgMin} min` },
        ].map((k) => (
          <div key={k.label} style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '0.875rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)' }}>{k.value}</div>
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
          {data.stuck.length === 0 && <div style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>Sin datos de progreso aún</div>}
          {data.stuck.sort((a, b) => b.current - a.current).slice(0, 5).map((s) => (
            <div key={s.challengeId} style={{ padding: '0.55rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-success)', flex: 1 }}>{s.challengeTitle}</span>
              <div style={{ width: 70, height: 3, background: 'var(--color-border-tertiary)', borderRadius: 99 }}>
                <div style={{ width: `${Math.min(100, s.current * 10)}%`, height: '100%', background: 'var(--color-text-danger)', borderRadius: 99 }} />
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', minWidth: 20, textAlign: 'right' }}>{s.current}</span>
            </div>
          ))}
        </>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {(['Dispositivos', 'Navegadores'] as const).map((title) => {
          const d = title === 'Dispositivos' ? data.devices : data.browsers
          return (
            <div key={title} style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
              {sh(title)}
              {Object.entries(d).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, count]) => (
                <div key={name} style={{ padding: '0.5rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--color-text-primary)' }}>{name || '—'}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>{count}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
