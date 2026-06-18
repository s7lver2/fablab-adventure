'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'

interface Props {
  avatar: string
  avatarImage?: string | null
  displayName: string
}

export function TopNav({ avatar, avatarImage, displayName }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch {
      setLoggingOut(false)
    }
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const isDashboard = pathname === '/dashboard' || pathname === '/'

  return (
    <nav className="topnav">
      <Link href="/" className="topnav__brand">
        Fab Lab Quest 🚀
      </Link>

      <div className="topnav__tabs">
        <Link
          href="/dashboard"
          className={`topnav__tab${isDashboard ? ' topnav__tab--active' : ''}`}
        >
          Dashboard
        </Link>
        <span className="topnav__tab topnav__tab--disabled">
          Cursos <span className="topnav__soon">pronto</span>
        </span>
      </div>

      <div className="topnav__profile-wrap" ref={ref}>
        <button
          className="topnav__profile-btn"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Menú de perfil"
        >
          {avatarImage ? (
            <Image
              src={avatarImage}
              alt={displayName}
              width={34}
              height={34}
              className="topnav__avatar-img"
            />
          ) : (
            <span className="topnav__avatar-emoji">{avatar || '🦊'}</span>
          )}
          <span className="topnav__name">{displayName}</span>
          <svg className="topnav__chevron" viewBox="0 0 10 6" fill="none">
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {open && (
          <div className="topnav__dropdown">
            <Link href="/profile" className="topnav__dropdown-item" onClick={() => setOpen(false)}>
              👤 Ver perfil
            </Link>
            <Link href="/settings" className="topnav__dropdown-item" onClick={() => setOpen(false)}>
              ⚙️ Configuración
            </Link>
            <div className="topnav__dropdown-sep" />
            <button
              type="button"
              className="topnav__dropdown-item topnav__dropdown-item--danger"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? '⏳ Saliendo…' : '🚪 Cerrar sesión'}
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
