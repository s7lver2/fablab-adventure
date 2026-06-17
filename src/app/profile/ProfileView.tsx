'use client'
import { useState } from 'react'
import { ProfileCard } from '@/components/ProfileCard'
import { StatCard } from '@/components/StatCard'
import { StarRating } from '@/components/StarRating'

interface Achievement {
  title: string
  stars: number
}

export function ProfileView({
  initialDisplayName,
  initialAvatar,
  initialProfileMessage,
  totalStars,
  challengesDone,
  achievements,
}: {
  initialDisplayName: string
  initialAvatar: string
  initialProfileMessage: string
  totalStars: number
  challengesDone: number
  achievements: Achievement[]
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [avatar, setAvatar] = useState(initialAvatar)
  const [profileMessage, setProfileMessage] = useState(initialProfileMessage)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')

  // Borradores para poder cancelar sin perder los valores guardados
  const [draftName, setDraftName] = useState(displayName)
  const [draftAvatar, setDraftAvatar] = useState(avatar)
  const [draftMessage, setDraftMessage] = useState(profileMessage)

  function openEdit() {
    setDraftName(displayName)
    setDraftAvatar(avatar)
    setDraftMessage(profileMessage)
    setError('')
    setEditing(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: draftName,
        avatar: draftAvatar,
        profileMessage: draftMessage,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'No se pudo guardar.')
      return
    }
    setDisplayName(draftName)
    setAvatar(draftAvatar)
    setProfileMessage(draftMessage)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="card">
        <h2>Editar perfil</h2>
        <form onSubmit={save}>
          <div className="field">
            <label className="field__label">Nombre</label>
            <input value={draftName} onChange={(e) => setDraftName(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label">Avatar (un emoji)</label>
            <input value={draftAvatar} onChange={(e) => setDraftAvatar(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label">
              Mensaje <span className="char-count">({draftMessage.length}/100)</span>
            </label>
            <textarea
              value={draftMessage}
              maxLength={100}
              onChange={(e) => setDraftMessage(e.target.value)}
            />
          </div>
          <button type="submit">Guardar</button>{' '}
          <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
            Cancelar
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    )
  }

  return (
    <>
      <ProfileCard
        avatar={avatar}
        displayName={displayName}
        profileMessage={profileMessage}
        action={
          <button
            type="button"
            className="profile-card__edit"
            aria-label="Editar perfil"
            onClick={openEdit}
          >
            ✏️
          </button>
        }
      />

      <div className="stats-row">
        <StatCard value={totalStars} label="Estrellas" />
        <StatCard value={challengesDone} label="Retos hechos" />
      </div>

      {achievements.length > 0 && (
        <>
          <h2>Conseguido</h2>
          <ul className="achievement-list">
            {achievements.map((a) => (
              <li key={a.title} className="achievement">
                <span>{a.title}</span>
                <StarRating stars={a.stars} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
