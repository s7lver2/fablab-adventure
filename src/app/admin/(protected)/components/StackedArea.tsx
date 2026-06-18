'use client'
import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import { chartAnim, INDIGO_RAMP, chartTheme } from './adminUi'

export function StackedArea({ labels, series }: { labels: string[]; series: { path: string; data: number[] }[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const chart = useRef<Chart | null>(null)
  useEffect(() => {
    function render() {
      if (!ref.current) return
      const theme = chartTheme()
      chart.current?.destroy()
      chart.current = new Chart(ref.current.getContext('2d')!, {
        type: 'line',
        data: { labels, datasets: series.map((s, i) => ({
          label: s.path, data: s.data, borderColor: INDIGO_RAMP[i % INDIGO_RAMP.length],
          backgroundColor: INDIGO_RAMP[i % INDIGO_RAMP.length] + '55', borderWidth: 1.5, fill: true, tension: 0.4, pointRadius: 0,
        })) },
        options: { responsive: true, maintainAspectRatio: false, animation: chartAnim(),
          plugins: { legend: { display: false } },
          scales: { x: { stacked: true, grid: { display: false }, ticks: { color: theme.textColor, font: { size: 9 } } },
            y: { stacked: true, grid: { color: theme.gridColor }, ticks: { color: theme.textColor, font: { size: 9 } } } } },
      })
    }
    render()
    window.addEventListener('adm-theme-change', render)
    return () => { window.removeEventListener('adm-theme-change', render); chart.current?.destroy() }
  }, [labels, series])
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        {series.map((s, i) => (
          <span key={s.path} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-muted)' }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: INDIGO_RAMP[i % INDIGO_RAMP.length] }} />{s.path}
          </span>
        ))}
      </div>
      <div style={{ position: 'relative', height: 200 }}><canvas ref={ref} role="img" aria-label="Tráfico por página apilado en el tiempo" /></div>
    </>
  )
}
