import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser(new UserRepository(getDb()))
  if (!isAdmin(user)) redirect('/admin/login')
  return (
    <div>
      <nav style={{ display: 'flex', gap: '1rem', padding: '0.75rem 1.5rem', borderBottom: '1px solid #2a2f3a' }}>
        <Link href="/admin">Resumen</Link>
        <Link href="/admin/users">Usuarios</Link>
        <Link href="/admin/appeals">Apelaciones</Link>
        <Link href="/admin/content">Contenido</Link>
        <Link href="/admin/analytics">Analítica</Link>
        <Link href="/admin/settings">Ajustes</Link>
      </nav>
      {children}
    </div>
  )
}
