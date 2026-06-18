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
      title={`Cambiar a tema ${theme === 'dark' ? 'claro' : 'oscuro'}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
        background: 'transparent',
        color: 'var(--adm-text-secondary)',
        border: '0.5px solid var(--adm-border)',
        borderRadius: 'var(--adm-radius-sm)',
        fontSize: 14,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        flexShrink: 0,
      }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
