import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { getCurrentUser } from '@/lib/session/server'
import { SettingsClient } from './SettingsClient'
import { TopNav } from '@/components/TopNav'

export default async function SettingsPage() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!user) redirect('/login')

  return (
    <>
      <TopNav avatar={user.avatar} avatarImage={user.avatarImage} displayName={user.displayName} />
      <main className="page page--narrow" style={{ minHeight: 'auto', paddingTop: '2rem' }}>
        <Link href="/dashboard" style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1.5rem', display: 'inline-block' }}>
          ← Volver
        </Link>
        <h1 style={{ marginBottom: '0.25rem' }}>⚙️ Configuración</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Ajusta tu experiencia de aprendizaje
        </p>
        <SettingsClient currentLanguage={user.chosenLanguage ?? null} />
      </main>
    </>
  )
}
