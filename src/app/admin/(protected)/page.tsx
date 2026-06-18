'use client'
import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import { INDIGO, INDIGO_2, INDIGO_RAMP, AMBER, chartAnim, areaGradient, glowPlugin, centerTextPlugin, chartTheme, DemoBadge } from './components/adminUi'
import { Heatmap } from './components/Heatmap'
import { Funnel } from './components/Funnel'
import { Gauge } from './components/Gauge'
import { StackedArea } from './components/StackedArea'

interface Summary {
  totalEvents: number
  sessions: number
  activeUsers: number
  bounceSessions: number
  avgSessionMs: number
  byHour: number[]
}
interface StuckRow {
  challengeId: number
  challengeTitle: string
  current: number
  avgAttempts: number
}
interface AnalyticsData {
  summary: Summary
  devices: Record<string, number>
  browsers: Record<string, number>
  stuck: StuckRow[]
  byDayHour: number[][]
  topPages: { path: string; count: number }[]
  pageSeries: { labels: string[]; series: { path: string; data: number[] }[] }
}

interface Country { code: string; name: string; flag: string; count: number }
interface City { city: string; country: string; flag: string; count: number }
interface GeoData { countries: Country[]; cities: City[]; totalLocated: number }

const panel: React.CSSProperties = {
  background: 'var(--adm-panel)',
  borderRadius: 'var(--adm-radius)',
  border: '0.5px solid var(--adm-border)',
  overflow: 'hidden',
}

const panelHeader: React.CSSProperties = {
  padding: '0.6rem 0.9rem',
  borderBottom: '0.5px solid var(--adm-border)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const headTitle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: 'var(--adm-text)' }
const headNote: React.CSSProperties = { fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)' }

function PanelHead({ title, note }: { title: string; note?: React.ReactNode }) {
  return (
    <div style={panelHeader}>
      <span style={headTitle}>{title}</span>
      {typeof note === 'string' ? <span style={headNote}>{note}</span> : note}
    </div>
  )
}

// Compact KPI tile for the top strip.
function Tile({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: string; accent?: 'danger' | 'success' | 'normal' }) {
  const color = accent === 'danger' ? 'var(--adm-danger)' : 'var(--adm-text)'
  const subColor = accent === 'danger' ? 'var(--adm-danger)' : 'var(--adm-success)'
  return (
    <div style={{ ...panel, padding: '0.7rem 0.9rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 23, fontWeight: 600, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: subColor }}>{sub}</div>}
    </div>
  )
}

// Horizontal bar list for categorical breakdowns (devices, browsers).
function BarList({ data, icons }: { data: Record<string, number>; icons?: Record<string, string> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1
  if (entries.length === 0) {
    return <div style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)' }}>Sin datos</div>
  }
  return (
    <div style={{ padding: '0.6rem 0.75rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {entries.slice(0, 5).map(([k, v], i) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--adm-text)', width: 82, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {icons?.[k] ?? '•'} {k}
          </span>
          <div style={{ flex: 1, height: 7, background: 'var(--adm-border)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${(v / total) * 100}%`, height: '100%', background: INDIGO_RAMP[i % INDIGO_RAMP.length], borderRadius: 99 }} />
          </div>
          <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-label)', width: 38, textAlign: 'right' }}>
            {Math.round((v / total) * 100)}%
          </span>
        </div>
      ))}
    </div>
  )
}

const DEVICE_ICONS: Record<string, string> = { desktop: '🖥', mobile: '📱', tablet: '📲', bot: '🤖', unknown: '❔' }

function fmtDuration(ms: number): string {
  if (!ms) return '0s'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}m ${s % 60}s`
}

export default function AdminOverviewPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [userCount, setUserCount] = useState(0)
  const [pendingAppeals, setPendingAppeals] = useState(0)
  const [geoData, setGeoData] = useState<GeoData | null>(null)
  const actRef = useRef<HTMLCanvasElement>(null)
  const langRef = useRef<HTMLCanvasElement>(null)
  const actChart = useRef<Chart | null>(null)
  const langChart = useRef<Chart | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/analytics').then((r) => r.json()),
      fetch('/api/admin/users').then((r) => r.json()),
      fetch('/api/admin/appeals').then((r) => r.json()),
      fetch('/api/admin/geo').then((r) => r.json()),
    ]).then(([a, u, ap, g]) => {
      setAnalytics(a)
      setUserCount(Array.isArray(u) ? u.length : 0)
      setPendingAppeals(Array.isArray(ap) ? ap.length : 0)
      setGeoData(g)
    })
  }, [])

  function buildCharts() {
    if (!analytics || !actRef.current || !langRef.current) return
    actChart.current?.destroy()
    langChart.current?.destroy()

    const theme = chartTheme()
    const scale = {
      grid: { color: theme.gridColor },
      border: { display: false as const },
      ticks: { color: theme.textColor, font: { family: 'monospace', size: 9 } },
    }
    const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}h`)

    actChart.current = new Chart(actRef.current.getContext('2d')!, {
      type: 'line',
      data: {
        labels: hourLabels,
        datasets: [{
          data: analytics.summary.byHour,
          backgroundColor: areaGradient(actRef.current.getContext('2d')!, actRef.current.height || 150, INDIGO),
          borderColor: INDIGO_2,
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: AMBER,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: chartAnim(),
        plugins: { legend: { display: false } },
        scales: { x: scale, y: scale },
      },
      plugins: [glowPlugin],
    })

    const t2 = chartTheme()
    langChart.current = new Chart(langRef.current.getContext('2d')!, {
      type: 'doughnut',
      data: {
        labels: ['JS', 'Python', 'Bloques'],
        datasets: [{ data: [58, 30, 12], backgroundColor: INDIGO_RAMP.slice(0, 3), borderWidth: 0, hoverOffset: 6 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { ...chartAnim(), animateRotate: true },
        cutout: '68%',
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: t2.textColor, font: { family: 'monospace', size: 9 }, boxWidth: 9, padding: 6 } },
        },
      },
      plugins: [centerTextPlugin('100%', 'ALUMNOS')],
    })
  }

  useEffect(() => {
    buildCharts()
    window.addEventListener('adm-theme-change', buildCharts)
    return () => {
      window.removeEventListener('adm-theme-change', buildCharts)
      actChart.current?.destroy()
      langChart.current?.destroy()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analytics])

  const s = analytics?.summary
  const bounceRate = s && s.sessions ? Math.round((s.bounceSessions / s.sessions) * 100) : 0
  const engagement = 100 - bounceRate

  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 9, color: 'var(--adm-label)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>sistema</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--adm-text)' }}>Resumen de la plataforma</div>
        </div>
        <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 9, color: 'var(--adm-label)' }}>
          actualizado {new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* KPI strip: 6 compact tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
        <Tile label="totalAlumnos" value={userCount} sub="registrados" />
        <Tile label="sesionesHoy" value={s?.sessions ?? '—'} sub="únicas" />
        <Tile label="eventos" value={s?.totalEvents ?? '—'} sub="total" />
        <Tile label="activos" value={s?.activeUsers ?? '—'} sub="usuarios" />
        <Tile label="t.medio sesión" value={s ? fmtDuration(s.avgSessionMs) : '—'} sub="duración" />
        <Tile
          label="apelaciones"
          value={pendingAppeals}
          sub={pendingAppeals > 0 ? '⚠ revisar' : 'al día'}
          accent={pendingAppeals > 0 ? 'danger' : 'success'}
        />
      </div>

      {/* Row: Activity (line) + Languages (donut) + Engagement gauge */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
        <div style={panel}>
          <PanelHead title="Actividad · últimas 24 h" note="eventos" />
          <div style={{ padding: '0.6rem' }}><div style={{ position: 'relative', height: 175 }}><canvas ref={actRef} /></div></div>
        </div>
        <div style={panel}>
          <PanelHead title="Lenguajes" note={<DemoBadge />} />
          <div style={{ padding: '0.6rem' }}><div style={{ position: 'relative', height: 175 }}><canvas ref={langRef} /></div></div>
        </div>
        <div style={panel}>
          <PanelHead title="Engagement" note={`${bounceRate}% rebote`} />
          <div style={{ padding: '0.6rem' }}>
            <Gauge value={engagement} label="ENGANCHE" height={150} />
          </div>
        </div>
      </div>

      {/* Row: Heatmap full width */}
      <div style={panel}>
        <PanelHead title="Actividad por día y hora" note="últimos 30 días" />
        <div style={{ padding: '0.75rem' }}>
          {analytics ? <Heatmap grid={analytics.byDayHour} /> : <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)' }}>Cargando…</div>}
        </div>
      </div>

      {/* Row: Top páginas (funnel) + Dispositivos + Navegadores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <div style={panel}>
          <PanelHead title="Páginas más vistas" note="top 5" />
          <div style={{ padding: '0.75rem' }}>
            {analytics && analytics.topPages.length > 0
              ? <Funnel rows={analytics.topPages.map((p) => ({ path: p.path, count: p.count }))} />
              : <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)' }}>Sin datos</div>}
          </div>
        </div>
        <div style={panel}>
          <PanelHead title="Dispositivos" />
          {analytics ? <BarList data={analytics.devices} icons={DEVICE_ICONS} /> : null}
        </div>
        <div style={panel}>
          <PanelHead title="Navegadores" />
          {analytics ? <BarList data={analytics.browsers} /> : null}
        </div>
      </div>

      {/* Row: Tráfico por página (stacked) + Dónde se atascan */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={panel}>
          <PanelHead title="Tráfico por página" note="7 días" />
          <div style={{ padding: '0.75rem' }}>
            {analytics && analytics.pageSeries.series.length > 0
              ? <StackedArea labels={analytics.pageSeries.labels} series={analytics.pageSeries.series} height={160} />
              : <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)' }}>Sin datos</div>}
          </div>
        </div>
        <div style={{ ...panel, display: 'flex', flexDirection: 'column' }}>
          <PanelHead title="Dónde se atascan los alumnos" note="atascos activos" />
          <div style={{ flex: 1, overflow: 'auto', maxHeight: 280 }}>
            {analytics && analytics.stuck.length === 0 && (
              <div style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)' }}>Sin datos de progreso aún</div>
            )}
            {analytics?.stuck
              .slice()
              .sort((a, b) => b.current - a.current)
              .slice(0, 8)
              .map((st) => (
                <div key={st.challengeId} style={{ padding: '0.45rem 0.75rem', borderBottom: '0.5px solid var(--adm-border)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
                  <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-success)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.challengeTitle}</span>
                  <div style={{ width: 100, height: 4, background: 'var(--adm-border)', borderRadius: 99 }}>
                    <div style={{ width: `${Math.min(100, st.current * 10)}%`, height: '100%', background: 'var(--adm-danger)', borderRadius: 99 }} />
                  </div>
                  <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)', minWidth: 20, textAlign: 'right' }}>{st.current}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Row: Geo — top países + sesiones localizadas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={panel}>
          <PanelHead title="Top países" note={<DemoBadge />} />
          <div style={{ padding: '0.6rem 0.75rem' }}>
            {geoData && geoData.countries.length > 0 ? (
              geoData.countries.slice(0, 5).map((c, ci) => (
                <div key={c.code ?? `c-${ci}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '0.5px solid var(--adm-border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--adm-text)' }}>{c.flag} {c.name}</span>
                  <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 12, color: 'var(--adm-accent-2)', fontWeight: 600 }}>{c.count}</span>
                </div>
              ))
            ) : (
              <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)' }}>Sin datos</div>
            )}
          </div>
        </div>
        <div style={panel}>
          <PanelHead title="Sesiones localizadas" note={<DemoBadge />} />
          <div style={{ padding: '0.6rem 0.75rem' }}>
            {geoData && geoData.cities.length > 0 ? (
              geoData.cities.slice(0, 5).map((city, i) => (
                <div key={`${city.city}-${i}`} style={{ padding: '0.3rem 0', borderBottom: '0.5px solid var(--adm-border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--adm-text)' }}>{city.flag} {city.city}, {city.country}</div>
                  <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)' }}>{city.count} sesiones</div>
                </div>
              ))
            ) : (
              <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)' }}>Sin datos</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
