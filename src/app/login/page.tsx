'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'No se pudo entrar.')
      return
    }
    router.push('/')
  }

  return (
    <main className="page page--narrow">
      <div className="card welcome-card">
        <div className="mascot">🚀🦊</div>
        <h1>Fab Lab Quest</h1>
        <p>¡Hola! ¿Cómo te llamas?</p>
        <form onSubmit={submit}>
          <div className="field">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tu nombre de usuario"
              autoFocus
            />
          </div>
          <button type="submit">¡Entrar! →</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    </main>
  )
}
