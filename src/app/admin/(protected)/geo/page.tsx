'use client'
import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import { chartTheme, INDIGO, INDIGO_RAMP, chartAnim, centerTextPlugin, DemoBadge } from '../components/adminUi'

interface CountryData {
  country: string
  name: string
  flag: string
  count: number
}

interface CityData {
  country: string
  city: string
  flag: string
  count: number
}

interface GeoData {
  countries: CountryData[]
  cities: CityData[]
  totalLocated: number
}

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

export default function GeoPage() {
  const [data, setData] = useState<GeoData | null>(null)
  const countriesChartRef = useRef<HTMLCanvasElement>(null)
  const citiesChartRef = useRef<HTMLCanvasElement>(null)
  const countriesChart = useRef<Chart | null>(null)
  const citiesChart = useRef<Chart | null>(null)

  useEffect(() => {
    fetch('/api/admin/geo').then((r) => r.json()).then(setData)
  }, [])

  useEffect(() => {
    if (!data || !countriesChartRef.current || !citiesChartRef.current) return
    countriesChart.current?.destroy()
    citiesChart.current?.destroy()

    const theme = chartTheme()
    const scale = { grid: { color: theme.gridColor }, border: { display: false as const }, ticks: { color: theme.textColor, font: { family: 'monospace', size: 10 } } }

    // Countries bar chart (top 10)
    const topCountries = data.countries.slice(0, 10)
    countriesChart.current = new Chart(countriesChartRef.current.getContext('2d')!, {
      type: 'bar',
      data: {
        labels: topCountries.map((c) => `${c.flag} ${c.name}`),
        datasets: [{ data: topCountries.map((c) => c.count), backgroundColor: INDIGO, borderRadius: 4, borderWidth: 0 }],
      },
      options: { animation: chartAnim(), indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: scale, y: scale } },
    })

    // Cities doughnut chart (top 8)
    const topCities = data.cities.slice(0, 8)
    citiesChart.current = new Chart(citiesChartRef.current.getContext('2d')!, {
      type: 'doughnut',
      data: {
        labels: topCities.map((c) => `${c.flag} ${c.city}`),
        datasets: [{ data: topCities.map((c) => c.count), backgroundColor: INDIGO_RAMP.concat(INDIGO_RAMP).slice(0, topCities.length), borderWidth: 0, hoverOffset: 6 }],
      },
      options: { animation: { ...chartAnim(), animateRotate: true }, cutout: '68%', plugins: { legend: { position: 'right' as const } } },
      plugins: [centerTextPlugin(String(totalCities), 'CIUDADES')],
    })

    return () => { countriesChart.current?.destroy(); citiesChart.current?.destroy() }
  }, [data])

  // Listen for theme change events to reinitialize charts
  useEffect(() => {
    const handleThemeChange = () => {
      countriesChart.current?.destroy()
      citiesChart.current?.destroy()
      countriesChart.current = null
      citiesChart.current = null
      // Trigger chart reinitialization
      if (data) {
        const theme = chartTheme()
        const scale = { grid: { color: theme.gridColor }, border: { display: false as const }, ticks: { color: theme.textColor, font: { family: 'monospace', size: 10 } } }

        if (countriesChartRef.current) {
          const topCountries = data.countries.slice(0, 10)
          countriesChart.current = new Chart(countriesChartRef.current.getContext('2d')!, {
            type: 'bar',
            data: {
              labels: topCountries.map((c) => `${c.flag} ${c.name}`),
              datasets: [{ data: topCountries.map((c) => c.count), backgroundColor: INDIGO, borderRadius: 4, borderWidth: 0 }],
            },
            options: { animation: chartAnim(), indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: scale, y: scale } },
          })
        }

        if (citiesChartRef.current) {
          const topCities = data.cities.slice(0, 8)
          citiesChart.current = new Chart(citiesChartRef.current.getContext('2d')!, {
            type: 'doughnut',
            data: {
              labels: topCities.map((c) => `${c.flag} ${c.city}`),
              datasets: [{ data: topCities.map((c) => c.count), backgroundColor: INDIGO_RAMP.concat(INDIGO_RAMP).slice(0, topCities.length), borderWidth: 0, hoverOffset: 6 }],
            },
            options: { animation: { ...chartAnim(), animateRotate: true }, cutout: '68%', plugins: { legend: { position: 'right' as const } } },
            plugins: [centerTextPlugin(String(totalCities), 'CIUDADES')],
          })
        }
      }
    }

    window.addEventListener('adm-theme-change', handleThemeChange)
    return () => window.removeEventListener('adm-theme-change', handleThemeChange)
  }, [data])

  if (!data) return <div style={{ padding: '1.25rem', fontFamily: 'var(--adm-font-mono)', fontSize: 12, color: 'var(--adm-text-secondary)' }}>Cargando…</div>

  const totalCountries = data.countries.length
  const totalCities = data.cities.length
  const topCountry = data.countries.length > 0 ? data.countries[0] : null

  return (
    <div style={{ padding: '1.25rem' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'var(--adm-font-display)', fontStyle: 'italic', fontSize: 28, fontWeight: 400, color: 'var(--adm-text-primary)', letterSpacing: '-0.01em', textTransform: 'lowercase' }}>geografía</div>
        <DemoBadge note="Geolocalización demo · falta geo-IP real" />
      </div>

      {/* KPI Cards Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Ubicaciones</div>
        <DemoBadge note="Geolocalización demo · falta geo-IP real" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, marginBottom: '1rem' }}>
        <div style={{ background: 'var(--adm-bg-secondary)', borderRadius: 'var(--adm-radius-sm)', padding: '0.875rem' }}>
          <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-tertiary)', marginBottom: 6 }}>total ubicaciones</div>
          <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--adm-text-primary)' }}>{data.totalLocated}</div>
        </div>
        <div style={{ background: 'var(--adm-bg-secondary)', borderRadius: 'var(--adm-radius-sm)', padding: '0.875rem' }}>
          <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-tertiary)', marginBottom: 6 }}>países únicos</div>
          <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--adm-text-primary)' }}>{totalCountries}</div>
        </div>
        <div style={{ background: 'var(--adm-bg-secondary)', borderRadius: 'var(--adm-radius-sm)', padding: '0.875rem' }}>
          <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-tertiary)', marginBottom: 6 }}>ciudades únicas</div>
          <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--adm-text-primary)' }}>{totalCities}</div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8 }}>
        {/* Countries Bar Chart */}
        {sec(
          <>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--adm-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--adm-text-primary)' }}>Top 10 países por sesiones</span>
              <DemoBadge note="Geolocalización demo · falta geo-IP real" />
            </div>
            <div style={{ padding: '0.75rem' }}>
              <canvas ref={countriesChartRef} height={250}></canvas>
            </div>
          </>
        )}

        {/* Cities Doughnut Chart */}
        {sec(
          <>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--adm-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--adm-text-primary)' }}>Top 8 ciudades</span>
              <DemoBadge note="Geolocalización demo · falta geo-IP real" />
            </div>
            <div style={{ padding: '0.75rem', display: 'flex', justifyContent: 'center' }}>
              <canvas ref={citiesChartRef} height={200} style={{ maxWidth: '100%' }}></canvas>
            </div>
          </>
        )}
      </div>

      {/* Countries Table */}
      <div style={{ marginBottom: 8 }}>
        {sec(
          <>
            {sh('Todos los países', `${data.countries.length} países`)}
            {data.countries.length === 0 ? (
              <div style={{ padding: '0.75rem 1rem', fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-text-secondary)' }}>Sin datos geográficos</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--adm-border)' }}>
                      <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontWeight: 500, color: 'var(--adm-text-tertiary)', fontFamily: 'var(--adm-font-mono)', fontSize: 10 }}>PAÍS</th>
                      <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontWeight: 500, color: 'var(--adm-text-tertiary)', fontFamily: 'var(--adm-font-mono)', fontSize: 10 }}>CÓDIGO</th>
                      <th style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: 500, color: 'var(--adm-text-tertiary)', fontFamily: 'var(--adm-font-mono)', fontSize: 10 }}>SESIONES</th>
                      <th style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: 500, color: 'var(--adm-text-tertiary)', fontFamily: 'var(--adm-font-mono)', fontSize: 10 }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.countries.map((country) => {
                      const pct = data.totalLocated > 0 ? ((country.count / data.totalLocated) * 100).toFixed(1) : '0.0'
                      return (
                        <tr key={country.country} style={{ borderBottom: '1px solid var(--adm-border)' }}>
                          <td style={{ padding: '0.5rem 1rem', color: 'var(--adm-text-primary)', fontSize: 12 }}>{country.flag} {country.name}</td>
                          <td style={{ padding: '0.5rem 1rem', color: 'var(--adm-text-secondary)', fontFamily: 'var(--adm-font-mono)', fontSize: 11 }}>{country.country}</td>
                          <td style={{ padding: '0.5rem 1rem', textAlign: 'right', color: 'var(--adm-text-primary)', fontFamily: 'var(--adm-font-mono)', fontSize: 11 }}>{country.count}</td>
                          <td style={{ padding: '0.5rem 1rem', textAlign: 'right', color: 'var(--adm-text-secondary)', fontFamily: 'var(--adm-font-mono)', fontSize: 11 }}>{pct}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Cities Table */}
      <div>
        {sec(
          <>
            {sh('Todas las ciudades', `${data.cities.length} ciudades`)}
            {data.cities.length === 0 ? (
              <div style={{ padding: '0.75rem 1rem', fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-text-secondary)' }}>Sin datos de ciudades</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--adm-border)' }}>
                      <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontWeight: 500, color: 'var(--adm-text-tertiary)', fontFamily: 'var(--adm-font-mono)', fontSize: 10 }}>CIUDAD</th>
                      <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontWeight: 500, color: 'var(--adm-text-tertiary)', fontFamily: 'var(--adm-font-mono)', fontSize: 10 }}>PAÍS</th>
                      <th style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: 500, color: 'var(--adm-text-tertiary)', fontFamily: 'var(--adm-font-mono)', fontSize: 10 }}>SESIONES</th>
                      <th style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: 500, color: 'var(--adm-text-tertiary)', fontFamily: 'var(--adm-font-mono)', fontSize: 10 }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cities.map((city, idx) => {
                      const pct = data.totalLocated > 0 ? ((city.count / data.totalLocated) * 100).toFixed(1) : '0.0'
                      return (
                        <tr key={`${city.country}-${city.city}-${idx}`} style={{ borderBottom: '1px solid var(--adm-border)' }}>
                          <td style={{ padding: '0.5rem 1rem', color: 'var(--adm-text-primary)', fontSize: 12 }}>{city.city}</td>
                          <td style={{ padding: '0.5rem 1rem', color: 'var(--adm-text-secondary)', fontSize: 12 }}>{city.flag} {city.country}</td>
                          <td style={{ padding: '0.5rem 1rem', textAlign: 'right', color: 'var(--adm-text-primary)', fontFamily: 'var(--adm-font-mono)', fontSize: 11 }}>{city.count}</td>
                          <td style={{ padding: '0.5rem 1rem', textAlign: 'right', color: 'var(--adm-text-secondary)', fontFamily: 'var(--adm-font-mono)', fontSize: 11 }}>{pct}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
