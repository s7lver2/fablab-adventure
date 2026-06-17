import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { CurriculumRepository } from '@/lib/curriculum/repository'
import { AppealRepository } from '@/lib/appeals/repository'

export default async function AdminSummaryPage() {
  const db = getDb()

  // Count users (excluding hidden root)
  const usersRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE hidden = 0").get() as any
  const userCount = usersRow?.count ?? 0

  // Count challenges
  const challenges = new CurriculumRepository(db)
  const challengeCount = challenges.listChallenges().length

  // Count pending appeals
  const appeals = new AppealRepository(db)
  const pendingCount = appeals.listPending().length

  return (
    <main style={{ maxWidth: 800, margin: '2rem auto', fontFamily: 'system-ui', padding: '0 1rem' }}>
      <h1>Panel de Administración</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
        <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
          <p style={{ fontSize: '0.875rem', color: '#666', margin: '0 0 0.5rem 0' }}>Usuarios activos</p>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{userCount}</p>
        </div>
        <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
          <p style={{ fontSize: '0.875rem', color: '#666', margin: '0 0 0.5rem 0' }}>Retos disponibles</p>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{challengeCount}</p>
        </div>
        <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
          <p style={{ fontSize: '0.875rem', color: '#666', margin: '0 0 0.5rem 0' }}>Apelaciones pendientes</p>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: pendingCount > 0 ? '#e74c3c' : '#27ae60' }}>
            {pendingCount}
          </p>
        </div>
      </div>
    </main>
  )
}
