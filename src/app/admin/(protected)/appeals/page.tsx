'use client'
import { useEffect, useState } from 'react'

interface Appeal {
  id: number
  userId: number
  challengeId: number
  language: string
  submittedCode: string
  submittedOutput: string
  message: string
  status: 'pending' | 'accepted' | 'rejected'
  reviewerAdminId: number | null
  feedback: string
  createdAt: number
  resolvedAt: number | null
}

export default function AppealsPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/appeals')
      .then((r) => r.json())
      .then(setAppeals)
  }, [])

  const selected = appeals.find((a) => a.id === selectedId)

  async function handleResolve(status: 'accepted' | 'rejected') {
    if (!selectedId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/appeals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedId, status, feedback }),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error || 'Error al resolver apelación')
        return
      }
      setAppeals((prev) => prev.filter((a) => a.id !== selectedId))
      setSelectedId(null)
      setFeedback('')
    } finally {
      setLoading(false)
    }
  }

  const input: React.CSSProperties = {
    background: 'var(--color-background-secondary)',
    border: '0.5px solid var(--color-border-tertiary)',
    borderRadius: 'var(--border-radius-md)',
    padding: '0.5rem',
    fontSize: 12,
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-mono)',
    outline: 'none',
    width: '100%',
    minHeight: '100px',
    resize: 'none',
  }

  const button: React.CSSProperties = {
    border: 'none',
    borderRadius: 'var(--border-radius-md)',
    padding: '0.4rem 0.875rem',
    fontSize: 12,
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
    fontWeight: 500,
  }

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
          revisión
        </div>
        <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)' }}>
          Apelaciones pendientes
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1rem', flex: 1, overflow: 'hidden' }}>
        {/* Left Panel: List */}
        <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Apelaciones</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)' }}>{appeals.length}</span>
          </div>
          {appeals.length === 0 ? (
            <div style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>
              Sin apelaciones pendientes
            </div>
          ) : (
            <div style={{ flex: 1, overflow: 'auto' }}>
              {appeals.map((appeal) => (
                <div
                  key={appeal.id}
                  onClick={() => {
                    setSelectedId(appeal.id)
                    setFeedback('')
                    setError('')
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '0.5px solid var(--color-border-tertiary)',
                    cursor: 'pointer',
                    background: selectedId === appeal.id ? 'var(--color-background-secondary)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 2 }}>
                    ID {appeal.id}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {appeal.message || '(sin mensaje)'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-secondary)', marginTop: 3 }}>
                    {new Date(appeal.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel: Detail */}
        {selected ? (
          <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                Apelación #{selected.id}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)' }}>
                {selected.language}
              </span>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Message Section */}
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Mensaje del alumno
                </div>
                <div style={{
                  background: 'var(--color-background-secondary)',
                  border: '0.5px solid var(--color-border-tertiary)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '0.75rem',
                  fontSize: 12,
                  color: 'var(--color-text-primary)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'var(--font-mono)',
                  minHeight: '60px',
                }}>
                  {selected.message || '(sin mensaje)'}
                </div>
              </div>

              {/* Code Section */}
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Código enviado
                </div>
                <div style={{
                  background: 'var(--color-background-secondary)',
                  border: '0.5px solid var(--color-border-tertiary)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '0.75rem',
                  fontSize: 11,
                  color: 'var(--color-text-secondary)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'var(--font-mono)',
                  maxHeight: '120px',
                  overflow: 'auto',
                }}>
                  {selected.submittedCode || '(vacío)'}
                </div>
              </div>

              {/* Output Section */}
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Output / Error
                </div>
                <div style={{
                  background: 'var(--color-background-secondary)',
                  border: '0.5px solid var(--color-border-tertiary)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '0.75rem',
                  fontSize: 11,
                  color: 'var(--color-text-secondary)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'var(--font-mono)',
                  maxHeight: '100px',
                  overflow: 'auto',
                }}>
                  {selected.submittedOutput || '(sin output)'}
                </div>
              </div>

              {/* Feedback Section */}
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Feedback / Notas
                </div>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Escribir feedback para el alumno…"
                  style={{
                    ...input,
                    fontFamily: 'var(--font-mono)',
                  }}
                />
              </div>

              {error && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-danger)', padding: '0.5rem', background: 'var(--color-background-danger)', borderRadius: 'var(--border-radius-md)' }}>
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleResolve('accepted')}
                  disabled={loading}
                  style={{
                    ...button,
                    flex: 1,
                    background: 'var(--color-background-success)',
                    color: 'var(--color-text-success)',
                  }}
                >
                  {loading ? '…' : '✓ Aceptar'}
                </button>
                <button
                  onClick={() => handleResolve('rejected')}
                  disabled={loading}
                  style={{
                    ...button,
                    flex: 1,
                    background: 'var(--color-background-danger)',
                    color: 'var(--color-text-danger)',
                  }}
                >
                  {loading ? '…' : '✕ Rechazar'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 'var(--border-radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
          }}>
            Seleccionar una apelación para ver detalles
          </div>
        )}
      </div>
    </div>
  )
}
