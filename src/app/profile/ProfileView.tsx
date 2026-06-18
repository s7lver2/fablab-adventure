'use client'
import { useState } from 'react'
import { ProfileLayout } from '@/components/profile/ProfileLayout'
import { BANNER_PRESETS } from '@/lib/users/banners'
import type { PublicProfile } from '@/lib/users/profileStats'

export function ProfileView({ profile }: { profile: PublicProfile }) {
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [avatar, setAvatar] = useState(profile.avatar)
  const [avatarImage, setAvatarImage] = useState<string | null>(profile.avatarImage ?? null)
  const [profileMessage, setProfileMessage] = useState(profile.profileMessage)
  const [banner, setBanner] = useState(profile.banner || 'preset:sunset')
  const [bannerImage, setBannerImage] = useState<string | null>(profile.bannerImage)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [resetting, setResetting] = useState(false)

  const [d, setD] = useState({ displayName, avatar, avatarImage, profileMessage, banner, bannerImage })

  function openEdit() {
    setD({ displayName, avatar, avatarImage, profileMessage, banner, bannerImage })
    setError('')
    setEditing(true)
  }

  function onPickBannerFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!/^image\/(png|jpeg|jpg|webp|gif)$/.test(file.type)) {
      setError('Formato de imagen no válido.')
      return
    }
    if (file.size > 500 * 1024) {
      setError('La imagen supera los 500 KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setD((s) => ({ ...s, banner: 'upload', bannerImage: String(reader.result) }))
    reader.readAsDataURL(file)
  }

  function onPickAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!/^image\/(png|jpeg|jpg|webp|gif)$/.test(file.type)) {
      setError('Formato de imagen no válido.')
      return
    }
    if (file.size > 500 * 1024) {
      setError('La imagen supera los 500 KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setD((s) => ({ ...s, avatarImage: String(reader.result) }))
    reader.readAsDataURL(file)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'No se pudo guardar.')
      return
    }
    setDisplayName(d.displayName)
    setAvatar(d.avatar)
    setAvatarImage(d.avatarImage)
    setProfileMessage(d.profileMessage)
    setBanner(d.banner)
    setBannerImage(d.bannerImage)
    setEditing(false)
  }

  async function resetLanguage() {
    if (!confirm('¿Seguro? Esto borrará todo tu progreso y podrás elegir otro lenguaje desde cero.')) return
    setResetting(true)
    await fetch('/api/me/language', { method: 'DELETE' })
    window.location.href = '/onboarding'
  }

  if (editing) {
    return (
      <div className="card">
        <h2>Editar perfil</h2>
        <form onSubmit={save}>
          <div className="field">
            <label className="field__label">Nombre</label>
            <input value={d.displayName} onChange={(e) => setD((s) => ({ ...s, displayName: e.target.value }))} />
          </div>
          <div className="field">
            <label className="field__label">Avatar (un emoji)</label>
            <input value={d.avatar} onChange={(e) => setD((s) => ({ ...s, avatar: e.target.value }))} />
          </div>
          <div className="field">
            <label className="field__label">Imagen de avatar (opcional)</label>
            <input type="file" accept="image/*" onChange={onPickAvatarFile} style={{ boxShadow: 'none' }} />
            {d.avatarImage && (
              <div
                style={{
                  width: 80,
                  height: 80,
                  marginTop: 8,
                  borderRadius: 40,
                  background: `center / cover no-repeat url("${d.avatarImage}")`,
                  border: '3px solid var(--violet)',
                  boxShadow: '0 4px 0 var(--violet-dark)',
                }}
              />
            )}
            {d.avatarImage && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setD((s) => ({ ...s, avatarImage: null }))}
                style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}
              >
                ✕ Eliminar imagen
              </button>
            )}
          </div>
          <div className="field">
            <label className="field__label">
              Mensaje <span className="char-count">({d.profileMessage.length}/100)</span>
            </label>
            <textarea
              value={d.profileMessage}
              maxLength={100}
              onChange={(e) => setD((s) => ({ ...s, profileMessage: e.target.value }))}
            />
          </div>
          <div className="field">
            <label className="field__label">Banner</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {BANNER_PRESETS.map((p) => {
                const selected = d.banner === `preset:${p.id}`
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setD((s) => ({ ...s, banner: `preset:${p.id}`, bannerImage: null }))}
                    title={p.label}
                    style={{
                      height: 36,
                      borderRadius: 10,
                      background: p.css,
                      border: selected ? '3px solid var(--violet-dark)' : '2px solid #f0e6e6',
                      boxShadow: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  />
                )
              })}
            </div>
            <label className="field__label" style={{ marginTop: 10 }}>
              O sube una imagen (máx. 500 KB)
            </label>
            <input type="file" accept="image/*" onChange={onPickBannerFile} style={{ boxShadow: 'none' }} />
            {d.banner === 'upload' && d.bannerImage && (
              <div
                style={{
                  height: 60,
                  marginTop: 8,
                  borderRadius: 10,
                  background: `center / cover no-repeat url("${d.bannerImage}")`,
                }}
              />
            )}
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

  const local: PublicProfile = { ...profile, displayName, avatar, avatarImage, profileMessage, banner, bannerImage }

  return (
    <>
      <ProfileLayout
        profile={local}
        action={
          <button
            type="button"
            className="btn-secondary"
            onClick={openEdit}
            style={{ padding: '6px 14px', fontSize: '.85rem' }}
          >
            ✏️ Editar perfil
          </button>
        }
      />
      <div className="pf-wrap">
        <button
          onClick={resetLanguage}
          disabled={resetting}
          className="btn btn-secondary"
          style={{ marginTop: '1.25rem', width: '100%' }}
        >
          {resetting ? 'Reiniciando…' : '🔄 Cambiar lenguaje (borra progreso)'}
        </button>
      </div>
    </>
  )
}
