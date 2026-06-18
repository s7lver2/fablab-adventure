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

const LANG_COLOR: Record<string, string> = {
  python: '#3b82f6',
  js: '#f59e0b',
  javascript: '#f59e0b',
  blocks: '#a855f7',
}

function LangBadge({ lang }: { lang: string }) {
  const color = LANG_COLOR[lang.toLowerCase()] ?? 'var(--adm-text-secondary)'
  return (
    <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color, background: `${color}20`, padding: '2px 7px', borderRadius: 99 }}>
      {lang}
    </span>
  )
}

function CodeBlock({ children, maxH = 120 }: { children: string; maxH?: number }) {
  return (
    <div style={{
      background: 'var(--adm-bg-primary)',
      border: '0.5px solid var(--adm-border)',
      borderRadius: 'var(--adm-radius-sm)',
      padding: '0.65rem 0.85rem',
      fontSize: 11,
      color: 'var(--adm-text-secondary)',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      fontFamily: 'var(--adm-font-mono)',
      maxHeight: maxH,
      overflow: 'auto',
      lineHeight: 1.6,
    }}>
      {children || <span style={{ opacity: 0.4 }}>(vacío)</span>}
    </div>
  )
}

const fieldLabel: React.CSSProperties = {
  fontFamily: 'var(--adm-font-mono)', fontSize: 9,
  color: 'var(--adm-text-tertiary)', letterSpacing: '0.08em',
  textTransform: 'uppercase', marginBottom: 5,
}

export default function AppealsPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/appeals').then((r) => r.json()).then(setAppeals)
  }, [])

  const selected = appeals.find((a) => a.id === selectedId)
  const pending = appeals.filter((a) => a.status === 'pending').length

  async function handleResolve(status: 'accepted' | 'rejected') {
    if (!selectedId) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/appeals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedId, status, feedback }),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error || 'Error al resolver')
        return
      }
      setAppeals((prev) => prev.filter((a) => a.id !== selectedId))
      setSelectedId(null); setFeedback('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '1.25rem', height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>GESTIÓN</div>
          <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--adm-text-primary)' }}>Apelaciones</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ background: 'var(--adm-panel)', border: '0.5px solid var(--adm-border)', borderRadius: 'var(--adm-radius-sm)', padding: '0.4rem 0.875rem', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 18, fontWeight: 600, color: pending > 0 ? 'var(--adm-danger)' : 'var(--adm-text-primary)' }}>{pending}</div>
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 9, color: 'var(--adm-text-tertiary)', letterSpacing: '0.06em' }}>PENDIENTES</div>
          </div>
          <div style={{ background: 'var(--adm-panel)', border: '0.5px solid var(--adm-border)', borderRadius: 'var(--adm-radius-sm)', padding: '0.4rem 0.875rem', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 18, fontWeight: 600, color: 'var(--adm-text-primary)' }}>{appeals.length}</div>
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 9, color: 'var(--adm-text-tertiary)', letterSpacing: '0.06em' }}>TOTAL</div>
          </div>
        </div>
      </div>

      {/* 2-panel split */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 10, flex: 1, minHeight: 0 }}>

        {/* Left: list */}
        <div style={{ background: 'var(--adm-panel)', border: '0.5px solid var(--adm-border)', borderRadius: 'var(--adm-radius)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '0.6rem 1rem', borderBottom: '0.5px solid var(--adm-border)', fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-tertiary)', letterSpacing: '0.08em', flexShrink: 0 }}>
            LISTA
          </div>

          {appeals.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-text-tertiary)' }}>
              Sin apelaciones
            </div>
          ) : (
            <div style={{ flex: 1, overflow: 'auto' }}>
              {appeals.map((appeal) => {
                const active = selectedId === appeal.id
                return (
                  <div
                    key={appeal.id}
                    onClick={() => { setSelectedId(appeal.id); setFeedback(''); setError('') }}
                    style={{
                      padding: '0.75rem 1rem',
                      borderBottom: '0.5px solid var(--adm-border)',
                      cursor: 'pointer',
                      background: active ? 'var(--adm-bg-secondary)' : 'transparent',
                      borderLeft: `3px solid ${active ? 'var(--adm-accent)' : 'transparent'}`,
                      transition: 'background 0.1s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: active ? 'var(--adm-accent)' : 'var(--adm-text-tertiary)' }}>#{appeal.id}</span>
                      <LangBadge lang={appeal.language} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--adm-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                      {appeal.message || '(sin mensaje)'}
                    </div>
                    <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 9, color: 'var(--adm-text-tertiary)' }}>
                      {new Date(appeal.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: detail */}
        {selected ? (
          <div style={{ background: 'var(--adm-panel)', border: '0.5px solid var(--adm-border)', borderRadius: 'var(--adm-radius)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Detail header */}
            <div style={{ padding: '0.6rem 1rem', borderBottom: '0.5px solid var(--adm-border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--adm-text-primary)', flex: 1 }}>Apelación #{selected.id}</span>
              <LangBadge lang={selected.language} />
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
              {/* 2-col layout: message + code left, actions right */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '1rem', height: '100%' }}>
                {/* Left: content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  <div>
                    <div style={fieldLabel}>Mensaje del alumno</div>
                    <CodeBlock maxH={80}>{selected.message}</CodeBlock>
                  </div>
                  <div>
                    <div style={fieldLabel}>Código enviado</div>
                    <CodeBlock maxH={160}>{selected.submittedCode}</CodeBlock>
                  </div>
                  <div>
                    <div style={fieldLabel}>Output / Error</div>
                    <CodeBlock maxH={80}>{selected.submittedOutput}</CodeBlock>
                  </div>
                </div>

                {/* Right: actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  <div>
                    <div style={fieldLabel}>Feedback / notas</div>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Escribir feedback para el alumno…"
                      style={{
                        background: 'var(--adm-bg-primary)',
                        border: '0.5px solid var(--adm-border)',
                        borderRadius: 'var(--adm-radius-sm)',
                        padding: '0.6rem',
                        fontSize: 12,
                        color: 'var(--adm-text-primary)',
                        fontFamily: 'var(--adm-font-mono)',
                        outline: 'none',
                        width: '100%',
                        minHeight: 120,
                        resize: 'vertical',
                        lineHeight: 1.6,
                      }}
                    />
                  </div>

                  {error && (
                    <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-error)', padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--adm-radius-sm)', border: '0.5px solid rgba(239,68,68,0.2)' }}>
                      {error}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button
                      onClick={() => handleResolve('accepted')}
                      disabled={loading}
                      style={{ background: 'var(--adm-success)', color: '#fff', border: 'none', borderRadius: 'var(--adm-radius-sm)', padding: '0.5rem', fontSize: 12, fontFamily: 'var(--adm-font-mono)', cursor: 'pointer', fontWeight: 500 }}
                    >
                      {loading ? '…' : '✓  Aceptar apelación'}
                    </button>
                    <button
                      onClick={() => handleResolve('rejected')}
                      disabled={loading}
                      style={{ background: 'transparent', color: 'var(--adm-error)', border: '1px solid var(--adm-error)', borderRadius: 'var(--adm-radius-sm)', padding: '0.5rem', fontSize: 12, fontFamily: 'var(--adm-font-mono)', cursor: 'pointer', fontWeight: 500 }}
                    >
                      {loading ? '…' : '✕  Rechazar'}
                    </button>
                  </div>

                  <div style={{ marginTop: 'auto', padding: '0.75rem', background: 'var(--adm-bg-secondary)', borderRadius: 'var(--adm-radius-sm)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {[
                      ['ID', `#${selected.id}`],
                      ['Usuario', `uid:${selected.userId}`],
                      ['Reto', `cid:${selected.challengeId}`],
                      ['Fecha', new Date(selected.createdAt).toLocaleDateString('es')],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 9, color: 'var(--adm-text-tertiary)', letterSpacing: '0.06em' }}>{k}</span>
                        <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-secondary)' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--adm-panel)', border: '0.5px solid var(--adm-border)', borderRadius: 'var(--adm-radius)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 24, opacity: 0.2 }}>◈</div>
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 12, color: 'var(--adm-text-tertiary)' }}>
              Seleccionar una apelación
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
