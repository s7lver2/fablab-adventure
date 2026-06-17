'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  username: string
  role: string
  pendingAppeals: number
}

const NAV_GROUPS = [
  [
    { href: '/admin', label: 'Resumen', icon: '▦' },
    { href: '/admin/live', label: 'En vivo', icon: '◉' },
    { href: '/admin/analytics', label: 'Analítica', icon: '↗' },
    { href: '/admin/sessions', label: 'Sesiones', icon: '◷' },
  ],
  [
    { href: '/admin/users', label: 'Alumnos', icon: '◎' },
    { href: '/admin/appeals', label: 'Apelaciones', icon: '◈' },
    { href: '/admin/content', label: 'Contenido', icon: '▤' },
  ],
  [
    { href: '/admin/audit', label: 'Auditoría', icon: '◫' },
    { href: '/admin/settings', label: 'Ajustes', icon: '⚙' },
  ],
]

export function AdminSidebar({ username, role, pendingAppeals }: Props) {
  const pathname = usePathname()

  function isActive(href: string) {
    return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
  }

  return (
    <div style={{
      width: 170, minWidth: 170, borderRight: '0.5px solid var(--color-border-tertiary)',
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      background: 'var(--color-background-primary)',
    }}>
      <div style={{ padding: '0.875rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Fab Lab Quest</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Panel admin</div>
      </div>

      <nav style={{ padding: '0.375rem 0', flex: 1 }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && <div style={{ height: '0.5px', background: 'var(--color-border-tertiary)', margin: '0.375rem 1rem' }} />}
            {group.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 1rem', fontSize: 12, textDecoration: 'none',
                  color: isActive(item.href) ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  borderLeft: `2px solid ${isActive(item.href) ? 'var(--color-text-success)' : 'transparent'}`,
                  background: isActive(item.href) ? 'var(--color-background-secondary)' : 'transparent',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{item.icon}</span>
                {item.label}
                {item.href === '/admin/appeals' && pendingAppeals > 0 && (
                  <span style={{
                    marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10,
                    background: 'var(--color-background-danger)', color: 'var(--color-text-danger)',
                    padding: '1px 5px', borderRadius: 99,
                  }}>{pendingAppeals}</span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div style={{ padding: '0.75rem 1rem', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
            background: 'var(--color-background-warning)', color: 'var(--color-text-warning)', flexShrink: 0,
          }}>{username.slice(0, 2).toUpperCase()}</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>{username}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-warning)' }}>⭑ {role}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
