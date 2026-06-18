'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ThemeToggle } from './ThemeToggle'

interface Props {
  username: string
  role: string
  pendingAppeals: number
}

interface NavItem {
  href: string
  label: string
  icon: string
  italic?: boolean
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'MONITOREO',
    items: [
      { href: '/admin', label: 'Resumen', icon: '▦' },
      { href: '/admin/live', label: 'En vivo', icon: '◉' },
      { href: '/admin/analytics', label: 'Analítica', icon: '↗' },
      { href: '/admin/sessions', label: 'Sesiones', icon: '◷' },
    ],
  },
  {
    label: 'GESTIÓN',
    items: [
      { href: '/admin/users', label: 'Alumnos', icon: '◎' },
      { href: '/admin/appeals', label: 'Apelaciones', icon: '◈' },
    ],
  },
  {
    label: 'DEV',
    items: [
      { href: '/admin/audit', label: 'Auditoría', icon: '◫' },
      { href: '/admin/settings', label: 'Ajustes', icon: '⚙' },
      { href: '/admin/api', label: 'api', icon: '⟨/⟩', italic: true },
    ],
  },
]

export function AdminSidebar({ username, role, pendingAppeals }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/admin/login')
      router.refresh()
    } catch {
      setLoggingOut(false)
    }
  }

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
          <div key={gi} style={{ marginTop: gi > 0 ? '0.5rem' : 0 }}>
            <div style={{
              padding: '0.5rem 1rem 0.2rem',
              fontFamily: 'var(--adm-font-mono)', fontSize: 9,
              color: 'var(--adm-text-tertiary)', letterSpacing: '0.1em',
            }}>
              {group.label}
            </div>
            {group.items.map((item) => (
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
                <span style={{ fontStyle: item.italic ? 'italic' : 'normal' }}>{item.label}</span>
                {item.href === '/admin/appeals' && pendingAppeals > 0 && (
                  <span style={{
                    marginLeft: 'auto',
                    width: 16, height: 16, borderRadius: '50%',
                    background: 'var(--adm-error)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--adm-font-mono)', fontSize: 9, fontWeight: 600, flexShrink: 0,
                  }}>{pendingAppeals}</span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '0.5px solid var(--adm-border)' }}>
        <ThemeToggle />
        <div ref={userRef} style={{ position: 'relative' }}>
          {menuOpen && (
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0,
              background: 'var(--adm-bg-secondary)', border: '0.5px solid var(--adm-border)',
              borderRadius: 'var(--adm-radius-sm)', padding: 4, zIndex: 50,
              boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
            }}>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  background: 'none', border: 'none', cursor: loggingOut ? 'default' : 'pointer',
                  padding: '6px 8px', borderRadius: 'var(--adm-radius-sm)',
                  fontSize: 12, fontFamily: 'var(--adm-font-body)', color: 'var(--adm-error)',
                  textAlign: 'left', opacity: loggingOut ? 0.6 : 1,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
              >
                <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 12 }}>⏻</span>
                {loggingOut ? 'Saliendo…' : 'Cerrar sesión'}
              </button>
            </div>
          )}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              background: menuOpen ? 'var(--adm-bg-secondary)' : 'none', border: 'none',
              cursor: 'pointer', padding: '4px 6px', borderRadius: 'var(--adm-radius-sm)',
              transition: 'background 0.15s',
            }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontFamily: 'var(--adm-font-mono)', fontSize: 10, fontWeight: 500,
              background: 'var(--adm-warning)', color: 'var(--adm-bg-primary)', flexShrink: 0,
            }}>{username.slice(0, 2).toUpperCase()}</div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--adm-text-primary)' }}>{username}</div>
              <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-tertiary)' }}>⭑ {role}</div>
            </div>
            <svg viewBox="0 0 10 6" width={9} height={6} fill="none" style={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
              <path d="M1 1l4 4 4-4" stroke="var(--adm-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
