'use client'
import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import { Card, SectionLabel } from './components/adminUi'

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
  stuck: StuckRow[]
}

interface Country {
  code: string
  name: string
  flag: string
  count: number
}

interface City {
  city: string
  country: string
  flag: string
  count: number
}

interface GeoData {
  countries: Country[]
  cities: City[]
  totalLocated: number
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

  useEffect(() => {
    if (!analytics || !actRef.current || !langRef.current) return
    actChart.current?.destroy()
    langChart.current?.destroy()

    const style = getComputedStyle(document.documentElement)
    const grd = style.getPropertyValue('--adm-grid').trim() || 'rgba(255,255,255,.07)'
    const txt = style.getPropertyValue('--adm-tick').trim() || '#8b85a6'
    const scale = {
      grid: { color: grd },
      border: { display: false as const },
      ticks: { color: txt, font: { family: 'monospace', size: 10 } },
    }

    actChart.current = new Chart(actRef.current.getContext('2d')!, {
      type: 'line',
      data: {
        labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Hoy'],
        datasets: [
          {
            data: analytics.summary.byHour.slice(0, 7),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.14)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: '#6366f1',
            borderWidth: 1.5,
          },
        ],
      },
      options: {
        animation: false,
        plugins: { legend: { display: false } },
        scales: { x: scale, y: scale },
      },
    })

    langChart.current = new Chart(langRef.current.getContext('2d')!, {
      type: 'doughnut',
      data: {
        labels: ['JS', 'Python', 'Bloques'],
        datasets: [
          {
            data: [58, 30, 12],
            backgroundColor: ['#6366f1', '#a5a8f5', '#3b3a6b'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        animation: false,
        cutout: '65%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: txt,
              font: { family: 'monospace', size: 10 },
              boxWidth: 10,
              padding: 8,
            },
          },
        },
      },
    })

    const handleThemeChange = () => {
      if (!analytics || !actRef.current || !langRef.current) return
      const newStyle = getComputedStyle(document.documentElement)
      const newGrd = newStyle.getPropertyValue('--adm-grid').trim() || 'rgba(255,255,255,.07)'
      const newTxt = newStyle.getPropertyValue('--adm-tick').trim() || '#8b85a6'
      const newScale = {
        grid: { color: newGrd },
        border: { display: false as const },
        ticks: { color: newTxt, font: { family: 'monospace', size: 10 } },
      }

      actChart.current?.destroy()
      langChart.current?.destroy()

      actChart.current = new Chart(actRef.current.getContext('2d')!, {
        type: 'line',
        data: {
          labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Hoy'],
          datasets: [
            {
              data: analytics.summary.byHour.slice(0, 7),
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99,102,241,0.14)',
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              pointBackgroundColor: '#6366f1',
              borderWidth: 1.5,
            },
          ],
        },
        options: {
          animation: false,
          plugins: { legend: { display: false } },
          scales: { x: newScale, y: newScale },
        },
      })

      langChart.current = new Chart(langRef.current.getContext('2d')!, {
        type: 'doughnut',
        data: {
          labels: ['JS', 'Python', 'Bloques'],
          datasets: [
            {
              data: [58, 30, 12],
              backgroundColor: ['#6366f1', '#a5a8f5', '#3b3a6b'],
              borderWidth: 0,
            },
          ],
        },
        options: {
          animation: false,
          cutout: '65%',
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: {
                color: newTxt,
                font: { family: 'monospace', size: 10 },
                boxWidth: 10,
                padding: 8,
              },
            },
          },
        },
      })
    }

    window.addEventListener('adm-theme-change', handleThemeChange)
    return () => {
      window.removeEventListener('adm-theme-change', handleThemeChange)
      actChart.current?.destroy()
      langChart.current?.destroy()
    }
  }, [analytics])

  return (
    <div style={{ padding: '1.25rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div
          style={{
            fontFamily: 'var(--adm-font-mono)',
            fontSize: 10,
            color: 'var(--adm-label)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 3,
          }}
        >
          sistema
        </div>
        <div
          style={{
            fontSize: 17,
            fontWeight: 500,
            color: 'var(--adm-text)',
          }}
        >
          Resumen de la plataforma
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, marginBottom: '1rem' }}>
        <div style={{ background: 'var(--adm-panel)', borderRadius: 'var(--adm-radius)', padding: '0.875rem', border: '0.5px solid var(--adm-border)' }}>
          <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)', marginBottom: 6 }}>const totalAlumnos</div>
          <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--adm-text)', marginBottom: 3 }}>
            {userCount}
          </div>
          <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-success)' }}>alumnos registrados</div>
        </div>
        <div style={{ background: 'var(--adm-panel)', borderRadius: 'var(--adm-radius)', padding: '0.875rem', border: '0.5px solid var(--adm-border)' }}>
          <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)', marginBottom: 6 }}>let sesionesHoy</div>
          <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--adm-text)', marginBottom: 3 }}>
            {analytics?.summary.sessions ?? '—'}
          </div>
          <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-success)' }}>sesiones únicas</div>
        </div>
        <div style={{ background: 'var(--adm-panel)', borderRadius: 'var(--adm-radius)', padding: '0.875rem', border: '0.5px solid var(--adm-border)' }}>
          <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)', marginBottom: 6 }}>let apelacionesPendientes</div>
          <div
            style={{
              fontFamily: 'var(--adm-font-mono)',
              fontSize: 20,
              fontWeight: 500,
              color: pendingAppeals > 0 ? 'var(--adm-danger)' : 'var(--adm-text)',
              marginBottom: 3,
            }}
          >
            {pendingAppeals}
          </div>
          <div
            style={{
              fontFamily: 'var(--adm-font-mono)',
              fontSize: 10,
              color: pendingAppeals > 0 ? 'var(--adm-danger)' : 'var(--adm-success)',
            }}
          >
            {pendingAppeals > 0 ? '⚠ requieren revisión' : 'al día'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: '1rem' }}>
        <Card>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--adm-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--adm-text)' }}>Actividad últimos 7 días</span>
            <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)' }}>eventos</span>
          </div>
          <div style={{ padding: '0.75rem' }}>
            <canvas ref={actRef} height={120}></canvas>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--adm-border)' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--adm-text)' }}>Lenguajes</span>
          </div>
          <div style={{ padding: '0.75rem', display: 'flex', justifyContent: 'center' }}>
            <canvas ref={langRef} width={140} height={140}></canvas>
          </div>
        </Card>
      </div>

      {analytics && (
        <Card style={{ marginBottom: '1rem' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--adm-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--adm-text)' }}>Dónde se atascan los alumnos</span>
            <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)' }}>atascos activos</span>
          </div>
          {analytics.stuck.length === 0 && (
            <div style={{ padding: '0.75rem 1rem', fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-label)' }}>Sin datos de progreso aún</div>
          )}
          {analytics.stuck
            .sort((a, b) => b.current - a.current)
            .slice(0, 5)
            .map((s) => (
              <div
                key={s.challengeId}
                style={{
                  padding: '0.55rem 1rem',
                  borderBottom: '0.5px solid var(--adm-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 12,
                }}
              >
                <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-success)', flex: 1 }}>{s.challengeTitle}</span>
                <div style={{ width: 80, height: 4, background: 'var(--adm-border)', borderRadius: 99 }}>
                  <div style={{ width: `${Math.min(100, s.current * 10)}%`, height: '100%', background: 'var(--adm-danger)', borderRadius: 99 }} />
                </div>
                <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)', minWidth: 24, textAlign: 'right' }}>{s.current}</span>
              </div>
            ))}
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1rem' }}>
        <Card>
          <SectionLabel style={{ marginBottom: 10 }}>TOP PAÍSES</SectionLabel>
          {geoData && geoData.countries.length > 0 ? (
            <div>
              {geoData.countries.slice(0, 5).map((country) => (
                <div key={country.code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '0.5px solid var(--adm-border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--adm-text)' }}>
                    {country.flag} {country.name}
                  </span>
                  <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 12, color: 'var(--adm-accent-2)', fontWeight: 600 }}>{country.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-label)' }}>Cargando...</div>
          )}
        </Card>

        <Card>
          <SectionLabel style={{ marginBottom: 10 }}>SESIONES LOCALIZADAS</SectionLabel>
          {geoData && geoData.cities.length > 0 ? (
            <div>
              {geoData.cities.slice(0, 10).map((city, i) => (
                <div key={`${city.city}-${i}`} style={{ padding: '0.5rem 0', borderBottom: '0.5px solid var(--adm-border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--adm-text)', marginBottom: 2 }}>
                    {city.flag} {city.city}, {city.country}
                  </div>
                  <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)' }}>
                    {city.count} sesiones
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-label)' }}>Cargando...</div>
          )}
        </Card>
      </div>
    </div>
  )
}
