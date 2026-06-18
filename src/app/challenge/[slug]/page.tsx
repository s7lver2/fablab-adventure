'use client'
import { useEffect, useState, use, useCallback, useRef } from 'react'
import Link from 'next/link'
import { runInWorker, runInteractive, type InteractiveController } from '@/lib/engine/client'
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
  const [consoleLines, setConsoleLines] = useState<string[]>([])
  const [awaitingPrompt, setAwaitingPrompt] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<{ correct: boolean; stars: number } | null>(null)
  const [nextSlug, setNextSlug] = useState<string | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [hintText, setHintText] = useState('')
  const [running, setRunning] = useState(false)
  const controllerRef = useRef<InteractiveController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const consoleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    controllerRef.current?.cancel()
    controllerRef.current = null
    setData(null)
    setConsoleLines([])
    setAwaitingPrompt(null)
    setInputValue('')
    setRunning(false)
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

  // Detiene cualquier ejecución al desmontar la página.
  useEffect(() => () => controllerRef.current?.cancel(), [])

  // Mantiene la consola desplazada al final (para ver la última línea y el cursor).
  useEffect(() => {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight
  }, [consoleLines, awaitingPrompt])

  const handleCodeChange = useCallback((c: string) => setCode(c), [])

  const execLang = (lang: Language): Language => (lang === 'blocks' ? 'js' : lang)

  function run() {
    if (!data) return
    controllerRef.current?.cancel()
    setConsoleLines([])
    setAwaitingPrompt(null)
    setInputValue('')
    setRunning(true)
    const ctrl = runInteractive(code, data.inputs[0] ?? null, execLang(data.language), {
      onOutput: (line) => setConsoleLines((prev) => [...prev, line]),
      onInputRequest: (prompt) => {
        setAwaitingPrompt(prompt)
        requestAnimationFrame(() => inputRef.current?.focus())
      },
      onDone: (res) => {
        if (res.error) setConsoleLines((prev) => [...prev, `⚠️ ${res.error}`])
        setAwaitingPrompt(null)
        setRunning(false)
        controllerRef.current = null
      },
    })
    controllerRef.current = ctrl
    if (!ctrl.interactive) {
      setConsoleLines((prev) => [...prev, '⚠️ La consola no puede pedir datos aquí (recarga la página e inténtalo de nuevo).'])
    }
  }

  // El usuario confirma la línea escrita en la consola y el programa continúa.
  function sendInput() {
    const ctrl = controllerRef.current
    if (!ctrl || awaitingPrompt === null) return
    const line = inputValue
    setConsoleLines((prev) => [...prev, `${awaitingPrompt}${line}`])
    setAwaitingPrompt(null)
    setInputValue('')
    ctrl.provideInput(line)
  }

  async function submit() {
    if (!data) return
    controllerRef.current?.cancel()
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
            <p style={{ marginTop: '0.4rem', fontSize: '0.95rem', lineHeight: 1.5 }}>{data.narrative}</p>
            <p
              style={{
                marginTop: '0.75rem',
                fontWeight: 600,
                color: 'var(--text)',
                fontSize: '0.95rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-line',
              }}
            >
              {data.variant.statement}
            </p>
          </div>

          {/* RIGHT-BOTTOM: Console Card */}
          <div className="challenge-console">
            <p className="panel__heading">▶ Consola{awaitingPrompt !== null ? ' · escribe y pulsa Enter' : ' · resultado'}</p>
            <div
              className="console-out"
              ref={consoleRef}
              onClick={() => awaitingPrompt !== null && inputRef.current?.focus()}
            >
              {consoleLines.length === 0 && awaitingPrompt === null ? (
                <span style={{ opacity: 0.4 }}>Aquí verás el resultado…</span>
              ) : (
                consoleLines.map((line, i) => <div key={i}>{line === '' ? ' ' : line}</div>)
              )}
              {awaitingPrompt !== null && (
                <div className="console-input-row">
                  {awaitingPrompt && <span>{awaitingPrompt}</span>}
                  <input
                    ref={inputRef}
                    className="console-input"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        sendInput()
                      }
                    }}
                    autoFocus
                    spellCheck={false}
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>
              )}
            </div>

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
