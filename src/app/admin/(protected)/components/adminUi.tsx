'use client'

import React, { CSSProperties, ReactNode } from 'react'

/**
 * Admin UI Primitives
 *
 * A suite of reusable components that use --adm-* tokens from the .admin-shell theme.
 * These components establish a consistent visual language for the admin panel.
 */

// ──────────────────────────────────────────────────────────────────
// Card Component
// ──────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function Card({ children, className, style }: CardProps) {
  const cardStyle: CSSProperties = {
    background: 'var(--adm-panel)',
    border: `1px solid var(--adm-border)`,
    borderRadius: 'var(--adm-radius)',
    padding: '1rem',
    ...style,
  }

  return (
    <div className={className} style={cardStyle}>
      {children}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// PageTitle Component
// ──────────────────────────────────────────────────────────────────

interface PageTitleProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function PageTitle({ children, className, style }: PageTitleProps) {
  const titleStyle: CSSProperties = {
    fontFamily: 'var(--adm-font-display)',
    fontStyle: 'italic',
    textTransform: 'lowercase',
    fontSize: '1.75rem',
    fontWeight: 400,
    color: 'var(--adm-text-primary)',
    marginBottom: '1.5rem',
    letterSpacing: '-0.01em',
    ...style,
  }

  return (
    <h1 className={className} style={titleStyle}>
      {children}
    </h1>
  )
}

// ──────────────────────────────────────────────────────────────────
// SectionLabel Component
// ──────────────────────────────────────────────────────────────────

interface SectionLabelProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function SectionLabel({ children, className, style }: SectionLabelProps) {
  const labelStyle: CSSProperties = {
    fontFamily: 'var(--adm-font-mono)',
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--adm-text-tertiary)',
    marginBottom: '0.5rem',
    ...style,
  }

  return (
    <label className={className} style={labelStyle}>
      {children}
    </label>
  )
}

// ──────────────────────────────────────────────────────────────────
// Kpi Component (Key Performance Indicator)
// ──────────────────────────────────────────────────────────────────

interface KpiProps {
  value: ReactNode
  label: ReactNode
  className?: string
  style?: CSSProperties
}

export function Kpi({ value, label, className, style }: KpiProps) {
  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem',
    background: 'var(--adm-panel)',
    border: `1px solid var(--adm-border)`,
    borderRadius: 'var(--adm-radius)',
    ...style,
  }

  const valueStyle: CSSProperties = {
    fontFamily: 'var(--adm-font-mono)',
    fontSize: '1.5rem',
    fontWeight: 600,
    color: 'var(--adm-text-primary)',
  }

  const labelStyle: CSSProperties = {
    fontFamily: 'var(--adm-font-mono)',
    fontSize: '0.75rem',
    color: 'var(--adm-text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  return (
    <div className={className} style={containerStyle}>
      <div style={valueStyle}>{value}</div>
      <div style={labelStyle}>{label}</div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Grid2 Component (2-column grid)
// ──────────────────────────────────────────────────────────────────

interface Grid2Props {
  children: ReactNode
  gap?: string | number
  className?: string
  style?: CSSProperties
}

export function Grid2({ children, gap = '1rem', className, style }: Grid2Props) {
  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap,
    ...style,
  }

  return (
    <div className={className} style={gridStyle}>
      {children}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// chartTheme() Helper
// ──────────────────────────────────────────────────────────────────

interface ChartThemeConfig {
  backgroundColor: string
  borderColor: string
  textColor: string
  gridColor: string
}

/**
 * Returns hex color values for Chart.js based on the current admin theme.
 * Canvas elements don't support CSS variables, so this helper reads the DOM theme
 * and returns computed hex values.
 *
 * @returns Object with { backgroundColor, borderColor, textColor, gridColor } hex values
 */
export function chartTheme(): ChartThemeConfig {
  // Get the admin-shell element and its theme
  const adminShell = document.querySelector('.admin-shell')
  const theme = adminShell?.getAttribute('data-theme') || 'dark'

  // Read computed styles from the root or admin-shell element
  const element = adminShell || document.documentElement
  const style = getComputedStyle(element)

  // Helper to get computed value and convert to hex
  const getColorAsHex = (varName: string, fallback: string): string => {
    const value = style.getPropertyValue(varName).trim()
    if (value && value.startsWith('#')) {
      return value
    }
    if (value && value.startsWith('rgb')) {
      return rgbToHex(value)
    }
    return fallback
  }

  // Map theme to appropriate hex values
  if (theme === 'light') {
    return {
      backgroundColor: '#f8fafc', // --adm-bg-primary light
      borderColor: '#cbd5e1', // --adm-border light
      textColor: '#1e293b', // --adm-text-primary light
      gridColor: '#e2e8f0', // --adm-border-light light
    }
  }

  // Dark theme (default)
  return {
    backgroundColor: '#0f172a', // --adm-bg-primary dark
    borderColor: '#475569', // --adm-border dark
    textColor: '#f1f5f9', // --adm-text-primary dark
    gridColor: '#334155', // --adm-border-light dark
  }
}

/**
 * Helper function to convert rgb() string to hex format
 * e.g., "rgb(240, 250, 255)" -> "#f0fafe"
 */
function rgbToHex(rgb: string): string {
  const matches = rgb.match(/\d+/g)
  if (!matches || matches.length < 3) return '#000000'

  const r = parseInt(matches[0], 10)
  const g = parseInt(matches[1], 10)
  const b = parseInt(matches[2], 10)

  return '#' + [r, g, b].map((x) => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

// ──────────────────────────────────────────────────────────────────
// Chart Toolkit (Colors, Animations, Gradients, Plugins, Badge)
// ──────────────────────────────────────────────────────────────────

export const INDIGO = '#6366f1'
export const INDIGO_2 = '#818cf8'
export const INDIGO_RAMP = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#4f46e5']
export const AMBER = '#fbbf24'

export function chartAnim(): { duration: number; easing: 'easeOutQuart' } {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  return { duration: reduce ? 0 : 1100, easing: 'easeOutQuart' }
}

export function areaGradient(ctx: CanvasRenderingContext2D, height: number, hex = INDIGO): CanvasGradient {
  const g = ctx.createLinearGradient(0, 0, 0, height)
  const r = parseInt(hex.slice(1, 3), 16), gg = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  g.addColorStop(0, `rgba(${r},${gg},${b},0.42)`)
  g.addColorStop(1, `rgba(${r},${gg},${b},0)`)
  return g
}

export const glowPlugin = {
  id: 'admGlow',
  beforeDatasetDraw(c: { ctx: CanvasRenderingContext2D }, a: { meta: { type: string } }) {
    if (a.meta.type === 'line') { c.ctx.save(); c.ctx.shadowColor = 'rgba(129,140,248,0.55)'; c.ctx.shadowBlur = 12 }
  },
  afterDatasetDraw(c: { ctx: CanvasRenderingContext2D }) { c.ctx.restore() },
}

export function centerTextPlugin(value: string, label: string) {
  return {
    id: 'admCenter',
    afterDraw(c: { ctx: CanvasRenderingContext2D; chartArea: { left: number; right: number; top: number; bottom: number } }) {
      const { ctx, chartArea } = c
      const x = chartArea.left + (chartArea.right - chartArea.left) / 2
      const y = chartArea.top + (chartArea.bottom - chartArea.top) / 2
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      const text = getComputedStyle(document.querySelector('.admin-shell') ?? document.body).getPropertyValue('--adm-text').trim() || '#ece9f5'
      ctx.fillStyle = text; ctx.font = "italic 600 22px Georgia, serif"; ctx.fillText(value, x, y - 4)
      ctx.fillStyle = '#8b85a6'; ctx.font = '9px ui-monospace, monospace'; ctx.fillText(label, x, y + 14)
      ctx.restore()
    },
  }
}

export function DemoBadge({ note = 'Datos de ejemplo · seguimiento real pendiente' }: { note?: string }) {
  return (
    <span
      title={note}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontFamily: 'var(--adm-font-mono)', fontSize: 9, letterSpacing: '0.12em',
        color: 'var(--adm-accent-2)', background: 'var(--adm-soft)',
        border: '1px solid var(--adm-border)', borderRadius: 20, padding: '2px 8px',
      }}
    >
      ● DEMO
    </span>
  )
}
