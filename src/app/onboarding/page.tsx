'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const LANGUAGES = [
  { id: 'blocks' as const, emoji: '🧩', name: 'Bloques', desc: 'Arrastra y suelta piezas visuales. ¡Ideal para empezar sin escribir código!' },
  { id: 'js' as const, emoji: '⚡', name: 'JavaScript', desc: 'El lenguaje de la web. Muy popular y muy potente.' },
  { id: 'python' as const, emoji: '🐍', name: 'Python', desc: 'Fácil de leer y escribir. Favorito de científicos y creadores.' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function choose(lang: 'blocks' | 'js' | 'python') {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/me/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      router.push('/dashboard')
    } catch {
      setError('Algo salió mal. Inténtalo de nuevo.')
      setLoading(false)
    }
  }

  return (
    <main className="page--narrow" style={{ padding: '1.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🚀</div>
        <h1>Elige tu lenguaje</h1>
        <p style={{ marginTop: '0.5rem' }}>
          Podrás cambiarlo después, pero tendrás que empezar el curso desde cero.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {LANGUAGES.map((l) => (
          <button
            key={l.id}
            onClick={() => choose(l.id)}
            disabled={loading}
            className="card"
            style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left', cursor: 'pointer', background: '#fff', width: '100%' }}
          >
            <span style={{ fontSize: '2.5rem', flexShrink: 0 }}>{l.emoji}</span>
            <div>
              <strong style={{ fontSize: '1.1rem', display: 'block' }}>{l.name}</strong>
              <p style={{ margin: 0, marginTop: '0.2rem', fontSize: '0.9rem' }}>{l.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {error && <p className="error" style={{ marginTop: '1rem' }}>{error}</p>}
    </main>
  )
}
