'use client'

interface Props {
  children: React.ReactNode
}

export function AdminShellWrapper({ children }: Props) {
  return (
    <div className="admin-shell" data-theme="dark" style={{ minHeight: '100vh' }} suppressHydrationWarning>
      <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'row' }}>
        {children}
      </div>
    </div>
  )
}
