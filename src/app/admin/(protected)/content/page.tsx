import { getDb } from '@/lib/db/connection'
import { CurriculumRepository } from '@/lib/curriculum/repository'

function sec(children: React.ReactNode) {
  return <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>{children}</div>
}

function sh(title: string, sub?: string) {
  return (
    <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{title}</span>
      {sub && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)' }}>{sub}</span>}
    </div>
  )
}

function KPI({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '0.875rem' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 3 }}>{value}</div>
      {sub && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)' }}>{sub}</div>}
    </div>
  )
}

export default async function ContentPage() {
  const db = getDb()
  const curriculum = new CurriculumRepository(db)

  const conceptsWithChallenges = curriculum.listConceptsWithChallenges()
  const totalConcepts = conceptsWithChallenges.length
  const totalChallenges = conceptsWithChallenges.reduce((sum, c) => sum + c.challenges.length, 0)
  const avgChallengesPerConcept = totalConcepts > 0 ? (totalChallenges / totalConcepts).toFixed(1) : '0'

  return (
    <div style={{ padding: '1.25rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>contenido</div>
        <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)' }}>Visión general del currículo</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, marginBottom: '1rem' }}>
        <KPI label="const conceptos" value={totalConcepts} sub="temas enseñados" />
        <KPI label="let retosTotal" value={totalChallenges} sub="retos en total" />
        <KPI label="let mediaRetos" value={avgChallengesPerConcept} sub="retos por concepto" />
      </div>

      {conceptsWithChallenges.map((concept) => (
        <div key={concept.id} style={{ marginBottom: '1rem' }}>
          {sec(
            <>
              {sh(concept.name, `${concept.challenges.length} retos`)}
              {concept.challenges.length === 0 ? (
                <div style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>Sin retos</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)' }}>
                        <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontWeight: 500, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>#</th>
                        <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontWeight: 500, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>SLUG</th>
                        <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontWeight: 500, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>TÍTULO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {concept.challenges.map((challenge, idx) => (
                        <tr key={challenge.id} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                          <td style={{ padding: '0.5rem 1rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{idx + 1}</td>
                          <td style={{ padding: '0.5rem 1rem', color: 'var(--color-text-success)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{challenge.slug}</td>
                          <td style={{ padding: '0.5rem 1rem', color: 'var(--color-text-primary)', fontSize: 12 }}>{challenge.title}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  )
}
