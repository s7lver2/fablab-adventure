import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { AppealRepository } from '@/lib/appeals/repository'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'
import { AdminSidebar } from './components/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!isAdmin(user)) redirect('/admin/login')

  const pendingAppeals = new AppealRepository(db).listPending().length

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminSidebar
        username={user.username}
        role={user.role}
        pendingAppeals={pendingAppeals}
      />
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--color-background-primary)' }}>
        {children}
      </main>
    </div>
  )
}
