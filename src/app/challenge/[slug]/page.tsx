'use client'
import { useEffect, useState, use } from 'react'
import { runInWorker } from '@/lib/engine/client'

interface ChallengeData {
  slug: string
  title: string
  narrative: string
  variant: { statement: string; starterCode: string; hints: string[] } | null
  inputs: unknown[]
}

export default function ChallengePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [data, setData] = useState<ChallengeData | null>(null)
  const [code, setCode] = useState('')
  const [consoleOut, setConsoleOut] = useState('')
  const [result, setResult] = useState<{ correct: boolean; stars: number } | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)

  useEffect(() => {
    fetch(`/api/challenges/${slug}`)
      .then((r) => r.json())
      .then((d: ChallengeData) => {
        setData(d)
        setCode(d.variant?.starterCode ?? '')
      })
  }, [slug])

  if (!data) return <main style={{ padding: 24 }}>Cargando…</main>
  if (!data.variant) return <main style={{ padding: 24 }}>Este reto no tiene versión en JavaScript todavía.</main>

  async function run() {
    // Ejecuta contra la primera entrada para que el alumno vea su salida.
    if (!data) return
    const res = await runInWorker(code, data.inputs[0])
    setConsoleOut(res.error ? res.error : res.output)
  }

  async function submit() {
    if (!data) return
    const outputs: string[] = []
    for (const input of data.inputs) {
      const res = await runInWorker(code, input)
      outputs.push(res.error ? '' : res.output)
    }
    const res = await fetch(`/api/challenges/${slug}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputs, hintsUsed }),
    })
    setResult(await res.json())
  }

  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', fontFamily: 'system-ui' }}>
      <h1>{data.title}</h1>
      <p>{data.narrative}</p>
      <p><strong>{data.variant.statement}</strong></p>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={10}
        style={{ width: '100%', fontFamily: 'monospace', fontSize: 14 }}
      />
      <div style={{ marginTop: 8 }}>
        <button onClick={run}>Ejecutar</button>{' '}
        <button onClick={submit}>Enviar</button>{' '}
        {data.variant.hints.length > 0 && (
          <button onClick={() => { setHintsUsed((n) => n + 1); alert(data.variant!.hints[0]) }}>
            Pista
          </button>
        )}
      </div>
      <pre style={{ background: '#111', color: '#0f0', padding: 12, minHeight: 60 }}>{consoleOut}</pre>
      {result && (
        <p>
          {result.correct ? `¡Correcto! ${'★'.repeat(result.stars)}` : 'Aún no es correcto, ¡prueba otra vez!'}
        </p>
      )}
    </main>
  )
}
