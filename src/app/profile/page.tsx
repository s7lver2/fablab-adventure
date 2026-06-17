'use client'
import { useEffect, useState } from 'react'

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState('')
  const [avatar, setAvatar] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setDisplayName(d.user.displayName)
          setAvatar(d.user.avatar)
          setProfileMessage(d.user.profileMessage)
        }
      })
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, avatar, profileMessage }),
    })
    const data = await res.json()
    setMsg(res.ok ? 'Guardado ✓' : data.error)
  }

  return (
    <main style={{ maxWidth: 480, margin: '2rem auto', fontFamily: 'system-ui' }}>
      <h1>Mi perfil</h1>
      <form onSubmit={save}>
        <label>Nombre<br /><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></label>
        <br /><br />
        <label>Avatar<br /><input value={avatar} onChange={(e) => setAvatar(e.target.value)} /></label>
        <br /><br />
        <label>
          Mensaje ({profileMessage.length}/100)<br />
          <textarea
            value={profileMessage}
            maxLength={100}
            onChange={(e) => setProfileMessage(e.target.value)}
          />
        </label>
        <br />
        <button type="submit">Guardar</button>
      </form>
      {msg && <p>{msg}</p>}
    </main>
  )
}
