'use client'
import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'

interface Summary { totalEvents: number; sessions: number; activeUsers: number; bounceSessions: number; avgSessionMs: number; byHour: number[] }
interface StuckRow { challengeId: number; challengeTitle: string; current: number; avgAttempts: number }
interface AnalyticsData { summary: Summary; stuck: StuckRow[] }

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

function KPI({ label, value, delta, danger }: { label: string; value: React.ReactNode; delta?: string; danger?: boolean }) {
  return (
    <div style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '0.875rem' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: danger ? 'var(--color-text-danger)' : 'var(--color-text-primary)', marginBottom: 3 }}>{value}</div>
      {delta && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: danger ? 'var(--color-text-danger)' : 'var(--color-text-success)' }}>{delta}</div>}
    </div>
  )
}

export default function AdminOverviewPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [userCount, setUserCount] = useState(0)
  const [pendingAppeals, setPendingAppeals] = useState(0)
  const actRef = useRef<HTMLCanvasElement>(null)
  const langRef = useRef<HTMLCanvasElement>(null)
  const actChart = useRef<Chart | null>(null)
  const langChart = useRef<Chart | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/analytics').then((r) => r.json()),
      fetch('/api/admin/users').then((r) => r.json()),
      fetch('/api/admin/appeals').then((r) => r.json()),
    ]).then(([a, u, ap]) => {
      setAnalytics(a)
      setUserCount(Array.isArray(u) ? u.length : 0)
      setPendingAppeals(Array.isArray(ap) ? ap.length : 0)
    })
  }, [])

  useEffect(() => {
    if (!analytics || !actRef.current || !langRef.current) return
    actChart.current?.destroy()
    langChart.current?.destroy()

    const style = getComputedStyle(document.documentElement)
    const grd = style.getPropertyValue('--color-border-tertiary').trim()
    const txt = style.getPropertyValue('--color-text-secondary').trim()
    const scale = { grid: { color: grd }, border: { display: false as const }, ticks: { color: txt, font: { family: 'monospace', size: 10 } } }

    actChart.current = new Chart(actRef.current.getContext('2d')!, {
      type: 'line',
      data: {
        labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Hoy'],
        datasets: [{
          data: analytics.summary.byHour.slice(0, 7),
          borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.08)',
          fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#1D9E75', borderWidth: 1.5,
        }],
      },
      options: { animation: false, plugins: { legend: { display: false } }, scales: { x: scale, y: scale } },
    })

    langChart.current = new Chart(langRef.current.getContext('2d')!, {
      type: 'doughnut',
      data: {
        labels: ['JS', 'Python', 'Bloques'],
        datasets: [{ data: [58, 30, 12], backgroundColor: ['#185FA5', '#1D9E75', '#BA7517'], borderWidth: 0 }],
      },
      options: { animation: false, cutout: '65%', plugins: { legend: { display: true, position: 'bottom', labels: { color: txt, font: { family: 'monospace', size: 10 }, boxWidth: 10, padding: 8 } } } },
    })

    return () => { actChart.current?.destroy(); langChart.current?.destroy() }
  }, [analytics])

  return (
    <div style={{ padding: '1.25rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>sistema</div>
        <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)' }}>Resumen de la plataforma</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, marginBottom: '1rem' }}>
        <KPI label="const totalAlumnos" value={userCount} delta="alumnos registrados" />
        <KPI label="let sesionesHoy" value={analytics?.summary.sessions ?? '—'} delta="sesiones únicas" />
        <KPI label="let apelacionesPendientes" value={pendingAppeals} delta={pendingAppeals > 0 ? '⚠ requieren revisión' : 'al día'} danger={pendingAppeals > 0} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: '1rem' }}>
        {sec(<>{sh('Actividad últimos 7 días', 'eventos')}<div style={{ padding: '0.75rem' }}><canvas ref={actRef} height={120}></canvas></div></>)}
        {sec(<>{sh('Lenguajes')}<div style={{ padding: '0.75rem', display: 'flex', justifyContent: 'center' }}><canvas ref={langRef} width={140} height={140}></canvas></div></>)}
      </div>

      {analytics && sec(<>
        {sh('Dónde se atascan los alumnos', 'atascos activos')}
        {analytics.stuck.length === 0 && (
          <div style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>Sin datos de progreso aún</div>
        )}
        {analytics.stuck.sort((a, b) => b.current - a.current).slice(0, 5).map((s) => (
          <div key={s.challengeId} style={{ padding: '0.55rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-success)', flex: 1 }}>{s.challengeTitle}</span>
            <div style={{ width: 80, height: 4, background: 'var(--color-border-tertiary)', borderRadius: 99 }}>
              <div style={{ width: `${Math.min(100, s.current * 10)}%`, height: '100%', background: 'var(--color-text-danger)', borderRadius: 99 }} />
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', minWidth: 24, textAlign: 'right' }}>{s.current}</span>
          </div>
        ))}
      </>)}
    </div>
  )
}
