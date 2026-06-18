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
