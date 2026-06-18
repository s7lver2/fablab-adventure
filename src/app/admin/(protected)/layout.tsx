import Script from 'next/script'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { AppealRepository } from '@/lib/appeals/repository'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'
import { AdminSidebar } from './components/AdminSidebar'
import { AdminShellWrapper } from './components/AdminShellWrapper'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!isAdmin(user)) redirect('/admin/login')

  const pendingAppeals = new AppealRepository(db).listPending().length

  return (
    <>
      {/* Applies theme from localStorage before React hydration to prevent flash */}
      <Script id="adm-no-flash" strategy="beforeInteractive">{`
        (function(){
          var t=localStorage.getItem('adm-theme')||'dark';
          var s=document.querySelector('.admin-shell');
          if(s) s.setAttribute('data-theme',t);
        })();
      `}</Script>

      <AdminShellWrapper>
        <div style={{ display: 'flex', minHeight: '100vh', flex: 1, minWidth: 0, width: '100%' }}>
          <AdminSidebar
            username={user.username}
            role={user.role}
            pendingAppeals={pendingAppeals}
          />
          <main style={{ flex: 1, minWidth: 0, overflow: 'auto', background: 'var(--adm-bg-primary)' }}>
            {children}
          </main>
        </div>
      </AdminShellWrapper>
    </>
  )
}
