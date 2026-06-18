import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { buildProfile } from '@/lib/users/profileStats'
import { getCurrentUser } from '@/lib/session/server'
import { AppBar } from '@/components/AppBar'
import { ProfileView } from './ProfileView'

export default async function ProfilePage() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!user) redirect('/login')
  const profile = buildProfile(db, user)

  return (
    <main className="page">
      <AppBar avatar={user.avatar} displayName={user.displayName} />
      <ProfileView profile={profile} />
    </main>
  )
}
