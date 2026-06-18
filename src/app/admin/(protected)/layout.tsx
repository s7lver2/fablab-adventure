import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { AppealRepository } from '@/lib/appeals/repository'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'
import { AdminSidebar } from './components/AdminSidebar'
import { AdminShellWrapper } from './components/AdminShellWrapper'

// No-flash inline script that runs before React hydration
const NO_FLASH_SCRIPT = `
  (function() {
    const storedTheme = localStorage.getItem('adm-theme') || 'dark';
    const shell = document.querySelector('.admin-shell');
    if (shell) {
      shell.setAttribute('data-theme', storedTheme);
    }
  })();
`;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!isAdmin(user)) redirect('/admin/login')

  const pendingAppeals = new AppealRepository(db).listPending().length

  return (
    <>
      {/* No-flash script: applies theme from localStorage before React hydration */}
      <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />

      <AdminShellWrapper>
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
      </AdminShellWrapper>
    </>
  )
}
