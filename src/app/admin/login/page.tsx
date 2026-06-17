'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const json = await res.json()
      if (res.ok) {
        router.push('/admin')
      } else {
        setError(json.error || 'Error en el login')
      }
    } catch (e) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: '1rem' }}>
      <h1>Acceso de admin</h1>
      <div style={{ marginBottom: '1rem' }}>
        <label>
          Usuario:
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            style={{ display: 'block', width: '100%', marginTop: '0.5rem' }}
          />
        </label>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label>
          Contraseña:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            style={{ display: 'block', width: '100%', marginTop: '0.5rem' }}
          />
        </label>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={handleLogin} disabled={loading} style={{ width: '100%' }}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </div>
  )
}
