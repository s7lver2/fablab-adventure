import Link from 'next/link'

export function AppBar({ avatar, displayName }: { avatar: string; displayName: string }) {
  return (
    <header className="appbar">
      <Link href="/" className="appbar__brand">
        Fab Lab Quest 🚀🦊
      </Link>
      <Link href="/profile" className="appbar__profile">
        <span className="avatar">{avatar || '🦊'}</span>
        <span>{displayName}</span>
      </Link>
    </header>
  )
}
