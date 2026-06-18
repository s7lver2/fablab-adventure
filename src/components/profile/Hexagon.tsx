'use client'

import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

export interface MasteryData {
  [conceptName: string]: number // 0-100 representing % completion
}

export function Hexagon({ mastery }: { mastery: MasteryData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    // Destroy previous chart if exists
    if (chartRef.current) {
      chartRef.current.destroy()
    }

    const labels = Object.keys(mastery)
    const data = Object.values(mastery).map((v) => Math.min(Math.max(v, 0), 100))

    if (labels.length === 0) {
      return
    }

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    chartRef.current = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [
          {
            label: 'Mastery %',
            data,
            borderColor: 'rgb(167, 139, 250)', // --violet
            backgroundColor: 'rgba(167, 139, 250, 0.15)',
            borderWidth: 2,
            pointRadius: 5,
            pointBackgroundColor: 'rgb(124, 58, 237)', // --violet-dark
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            tension: 0.2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 20,
              font: {
                size: 11,
              },
              color: 'rgb(124, 111, 111)', // --text-dim
            },
            grid: {
              color: 'rgba(167, 139, 250, 0.2)',
            },
            angleLines: {
              color: 'rgba(167, 139, 250, 0.2)',
            },
            pointLabels: {
              font: {
                size: 12,
                weight: 'bold' as const,
              },
              color: 'rgb(59, 47, 47)', // --text
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(59, 47, 47, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                return `${Math.round(context.parsed.r as number)}%`
              },
            },
          },
        },
      },
    })

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
      }
    }
  }, [mastery])

  return <canvas ref={canvasRef} className="pf-hexagon-canvas" />
}
