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
    <main style={{ maxWidth: 360, margin: '4rem auto', fontFamily: 'system-ui' }}>
      <h1>Entrar</h1>
      <form onSubmit={submit}>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Tu nombre de usuario"
          style={{ width: '100%', padding: 8, fontSize: 16 }}
        />
        <button type="submit" style={{ marginTop: 12, padding: '8px 16px' }}>
          Entrar
        </button>
      </form>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </main>
  )
}
