'use client'

import { ThemeToggle } from './ThemeToggle'

interface Props {
  children: React.ReactNode
}

export function AdminShellWrapper({ children }: Props) {
  return (
    <div className="admin-shell" data-theme="dark" style={{ minHeight: '100vh' }} suppressHydrationWarning>
      <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'row', position: 'relative' }}>
        {children}

        {/* Floating theme toggle */}
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          zIndex: 1000,
        }}>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
