'use client'
import { useEffect, useState, use, useCallback } from 'react'
import Link from 'next/link'
import { runInWorker } from '@/lib/engine/client'
import { BlocklyEditor } from './BlocklyEditor'
import type { Language } from '@/lib/curriculum/types'

interface ChallengeData {
  slug: string
  title: string
  narrative: string
  language: Language
  variant: { statement: string; starterCode: string; hints: string[] } | null
  inputs: unknown[]
}

export default function ChallengePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [data, setData] = useState<ChallengeData | null>(null)
  const [code, setCode] = useState('')
  const [consoleOut, setConsoleOut] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<{ correct: boolean; stars: number } | null>(null)
  const [nextSlug, setNextSlug] = useState<string | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [hintText, setHintText] = useState('')
  const [running, setRunning] = useState(false)

  useEffect(() => {
    setData(null)
    setConsoleOut('')
    setSubmitted(false)
    setScore(null)
    setNextSlug(null)
    setHintsUsed(0)
    setHintText('')
    fetch(`/api/challenges/${slug}`)
      .then((r) => r.json())
      .then((d: ChallengeData) => {
        setData(d)
        if (d.language !== 'blocks') setCode(d.variant?.starterCode ?? '')
      })
  }, [slug])

  const handleCodeChange = useCallback((c: string) => setCode(c), [])

  const execLang = (lang: Language): Language => (lang === 'blocks' ? 'js' : lang)

  async function run() {
    if (!data || data.inputs.length === 0) return
    setRunning(true)
    const res = await runInWorker(code, data.inputs[0], execLang(data.language))
    setConsoleOut(res.error ?? res.output)
    setRunning(false)
  }

  async function submit() {
    if (!data) return
    setRunning(true)
    const outputs: string[] = []
    for (const input of data.inputs) {
      const res = await runInWorker(code, input, execLang(data.language))
      outputs.push(res.error ? '' : res.output)
    }
    const res = await fetch(`/api/challenges/${slug}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputs, hintsUsed }),
    })
    const json = await res.json()
    setScore({ correct: json.correct, stars: json.stars })
    setNextSlug(json.next ?? null)
    setSubmitted(true)
    setRunning(false)
  }

  function showHint() {
    if (!data?.variant?.hints?.length) return
    const idx = Math.min(hintsUsed, data.variant.hints.length - 1)
    setHintText(data.variant.hints[idx])
    setHintsUsed((n) => Math.min(n + 1, data!.variant!.hints.length))
  }

  if (!data) {
    return (
      <div className="challenge-page challenge-page--loading">
        <p>Cargando…</p>
      </div>
    )
  }

  if (!data.variant) {
    return (
      <div className="challenge-page challenge-page--loading">
        <p>Este reto no tiene versión disponible para tu lenguaje.</p>
        <Link href="/" className="btn" style={{ marginTop: '1rem' }}>← Volver</Link>
      </div>
    )
  }

  const isBlocks = data.language === 'blocks'
  const hasHints = (data.variant.hints?.length ?? 0) > 0

  return (
    <div className="challenge-page">
      <header className="challenge-topbar">
        <Link href="/" className="challenge-topbar__back">← Volver</Link>
        <h1 className="challenge-topbar__title">{data.title}</h1>
        {score && (
          <span className="chip" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            {'★'.repeat(score.stars)}{'☆'.repeat(3 - score.stars)}
          </span>
        )}
      </header>

      <div className="challenge-grid">
        {/* LEFT: Code Editor */}
        <div className="challenge-left">
          <div className="panel" style={{ flex: 1, minHeight: 0 }}>
            <p className="panel__heading">✏️ Tu código</p>
            {isBlocks ? (
              <BlocklyEditor onCodeChange={handleCodeChange} />
            ) : (
              <textarea
                className="code-editor"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
              />
            )}
            <div className="panel__actions" style={{ gap: '0.75rem' }}>
              <button onClick={run} disabled={running} className="btn" style={{ flex: 1 }}>
                {running ? 'Ejecutando…' : '▶ Ejecutar'}
              </button>
              {hasHints && (
                <button onClick={showHint} disabled={running} className="btn btn-secondary">
                  💡 Pista
                </button>
              )}
            </div>
            {hintText && <p className="hint-box">{hintText}</p>}
          </div>
        </div>

        {/* RIGHT: Lesson Top + Console Bottom */}
        <div className="challenge-right">
          {/* RIGHT-TOP: Lesson Card */}
          <div className="challenge-lesson">
            <p className="panel__heading">📖 La lección</p>
            <p style={{ marginTop: '0.4rem', fontSize: '0.95rem' }}>{data.narrative}</p>
            <p style={{ marginTop: '0.75rem', fontWeight: 700, color: 'var(--text)', fontSize: '1rem' }}>
              {data.variant.statement}
            </p>
          </div>

          {/* RIGHT-BOTTOM: Console Card */}
          <div className="challenge-console">
            <p className="panel__heading">▶ Consola · resultado</p>
            <pre className="console-out">
              {consoleOut || <span style={{ opacity: 0.4 }}>Aquí verás el resultado…</span>}
            </pre>

            {data.inputs.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <p className="panel__heading" style={{ fontSize: '0.9rem' }}>🧪 Casos de prueba</p>
                <ul className="test-list">
                  {data.inputs.map((_, i) => (
                    <li key={i} className="test-item">
                      <span className="test-item__icon">{submitted ? (score?.correct ? '✅' : '❌') : '⬜'}</span>
                      <span className="test-item__label">Caso {i + 1}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {score && (
              <div className={`result-banner ${score.correct ? 'result-banner--ok' : 'result-banner--fail'}`}>
                {score.correct
                  ? `🎉 ¡Correcto! ${'★'.repeat(score.stars)}`
                  : '❌ Aún no es correcto. ¡Sigue intentando!'}
              </div>
            )}

            <div className="panel__actions" style={{ marginTop: '1rem' }}>
              <button onClick={submit} disabled={running} className="btn" style={{ flex: 1 }}>
                {running ? 'Comprobando…' : '🚀 Enviar solución'}
              </button>
            </div>

            {submitted && score?.correct && (
              <div className="panel__actions" style={{ marginTop: '0.75rem' }}>
                {nextSlug ? (
                  <Link href={`/challenge/${nextSlug}`} className="btn" style={{ flex: 1, textAlign: 'center' }}>
                    Siguiente →
                  </Link>
                ) : (
                  <Link href="/dashboard" className="btn" style={{ flex: 1, textAlign: 'center' }}>
                    🎉 ¡Curso completado! Volver al inicio
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
