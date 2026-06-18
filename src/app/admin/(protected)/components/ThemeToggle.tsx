'use client'

import { useState, useEffect } from 'react'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Read theme from localStorage on mount
    const storedTheme = localStorage.getItem('adm-theme') as 'dark' | 'light' | null
    const initialTheme = storedTheme || 'dark'
    setTheme(initialTheme)

    // Apply theme to DOM
    applyTheme(initialTheme)
    setMounted(true)
  }, [])

  function applyTheme(newTheme: 'dark' | 'light') {
    const adminShell = document.querySelector('.admin-shell')
    if (adminShell) {
      adminShell.setAttribute('data-theme', newTheme)
    }

    // Emit custom event for charts to listen
    window.dispatchEvent(
      new CustomEvent('adm-theme-change', {
        detail: { theme: newTheme },
      })
    )
  }

  function handleToggle() {
    const newTheme = theme === 'dark' ? 'light' : 'dark'

    // Update state
    setTheme(newTheme)

    // Save to localStorage
    localStorage.setItem('adm-theme', newTheme)

    // Apply to DOM and emit event
    applyTheme(newTheme)
  }

  if (!mounted) {
    return null
  }

  return (
    <button
      onClick={handleToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--adm-bg-secondary)',
        color: 'var(--adm-text-primary)',
        border: '0.5px solid var(--adm-border)',
        borderRadius: 'var(--adm-radius-sm)',
        padding: '6px 10px',
        fontSize: 12,
        fontFamily: 'var(--adm-font-mono)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
      }}
      title={`Cambiar a tema ${theme === 'dark' ? 'claro' : 'oscuro'}`}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
      <span>{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
    </button>
  )
}
