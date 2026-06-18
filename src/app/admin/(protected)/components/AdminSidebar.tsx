'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from './ThemeToggle'

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
    { href: '/admin/geo', label: 'Geografía', icon: '🌍' },
  ],
]

export function AdminSidebar({ username, role, pendingAppeals }: Props) {
  const pathname = usePathname()

  function isActive(href: string) {
    return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
  }

  return (
    <div style={{
      width: 170, minWidth: 170, borderRight: '0.5px solid var(--adm-border)',
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      background: 'var(--adm-bg-primary)',
    }}>
      <div style={{ padding: '0.875rem 1rem', borderBottom: '0.5px solid var(--adm-border)' }}>
        <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Fab Lab Quest</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--adm-text-primary)' }}>Panel admin</div>
      </div>

      <nav style={{ padding: '0.375rem 0', flex: 1 }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && <div style={{ height: '0.5px', background: 'var(--adm-border-light)', margin: '0.375rem 1rem' }} />}
            {group.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 1rem', fontSize: 12, textDecoration: 'none',
                  color: isActive(item.href) ? 'var(--adm-text-primary)' : 'var(--adm-text-secondary)',
                  borderLeft: `2px solid ${isActive(item.href) ? 'var(--adm-success)' : 'transparent'}`,
                  background: isActive(item.href) ? 'var(--adm-bg-secondary)' : 'transparent',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive(item.href)) {
                    (e.currentTarget as HTMLAnchorElement).style.color = 'var(--adm-accent)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(item.href)) {
                    (e.currentTarget as HTMLAnchorElement).style.color = 'var(--adm-text-secondary)'
                  }
                }}
              >
                <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 13 }}>{item.icon}</span>
                {item.label}
                {item.href === '/admin/appeals' && pendingAppeals > 0 && (
                  <span style={{
                    marginLeft: 'auto', fontFamily: 'var(--adm-font-mono)', fontSize: 10,
                    background: 'var(--adm-error)', color: 'var(--adm-text-primary)',
                    padding: '1px 5px', borderRadius: 99,
                  }}>{pendingAppeals}</span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '0.5px solid var(--adm-border)' }}>
        <ThemeToggle />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontFamily: 'var(--adm-font-mono)', fontSize: 10, fontWeight: 500,
            background: 'var(--adm-warning)', color: 'var(--adm-bg-primary)', flexShrink: 0,
          }}>{username.slice(0, 2).toUpperCase()}</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--adm-text-primary)' }}>{username}</div>
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-tertiary)' }}>⭑ {role}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
