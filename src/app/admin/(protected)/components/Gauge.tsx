'use client'
import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import { chartAnim, INDIGO, centerTextPlugin } from './adminUi'

export function Gauge({ value, label, height = 150 }: { value: number; label: string; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const chart = useRef<Chart | null>(null)
  useEffect(() => {
    if (!ref.current) return
    chart.current?.destroy()
    chart.current = new Chart(ref.current.getContext('2d')!, {
      type: 'doughnut',
      data: { datasets: [{ data: [value, 100 - value], backgroundColor: [INDIGO, 'rgba(255,255,255,0.08)'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, rotation: -90, circumference: 180, cutout: '75%',
        animation: { ...chartAnim(), animateRotate: true }, plugins: { legend: { display: false }, tooltip: { enabled: false } } },
      plugins: [centerTextPlugin(`${Math.round(value)}%`, label)],
    })
    return () => chart.current?.destroy()
  }, [value, label])
  return <div style={{ position: 'relative', height }}><canvas ref={ref} role="img" aria-label={`${label}: ${Math.round(value)}%`} /></div>
}
