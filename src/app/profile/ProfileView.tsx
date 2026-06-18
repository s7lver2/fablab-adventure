'use client'
import { useState } from 'react'
import { ProfileLayout } from '@/components/profile/ProfileLayout'
import { ProfileHero } from '@/components/profile/ProfileHero'
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
  const [saving, setSaving] = useState(false)

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
    setSaving(true)
    const res = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d),
    })
    const data = await res.json()
    setSaving(false)
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

  const local: PublicProfile = { ...profile, displayName, avatar, avatarImage, profileMessage, banner, bannerImage }

  if (editing) {
    return (
      <div className="pf-wrap">
        <form onSubmit={save} style={{ display: 'contents' }}>
          {/* Profile hero en modo edición */}
          <div className="pf-card" style={{ opacity: 0.8 }}>
            <div className="pf-banner" style={{ position: 'relative' }}>
              <select
                value={d.banner === 'upload' ? 'upload' : d.banner}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === 'upload') {
                    document.getElementById('banner-file')?.click()
                  } else {
                    setD((s) => ({ ...s, banner: val, bannerImage: null }))
                  }
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer',
                }}
              >
                {BANNER_PRESETS.map((p) => (
                  <option key={p.id} value={`preset:${p.id}`}>
                    {p.label}
                  </option>
                ))}
                <option value="upload">Subir imagen</option>
              </select>
              <div style={{ position: 'absolute', bottom: 8, right: 8, fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                Clic para cambiar banner
              </div>
              <input
                id="banner-file"
                type="file"
                accept="image/*"
                onChange={onPickBannerFile}
                style={{ display: 'none' }}
              />
            </div>
            <div className="pf-body">
              <div className="pf-avatar" style={{ position: 'relative' }}>
                {d.avatarImage ? (
                  <img src={d.avatarImage} alt={d.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                ) : (
                  d.avatar || '🦊'
                )}
                <label
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    background: 'var(--violet)',
                    color: 'white',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                  }}
                  title="Cambiar avatar"
                >
                  📷
                  <input type="file" accept="image/*" onChange={onPickAvatarFile} style={{ display: 'none' }} />
                </label>
              </div>
              <input
                type="text"
                value={d.displayName}
                onChange={(e) => setD((s) => ({ ...s, displayName: e.target.value }))}
                style={{
                  fontSize: 'inherit',
                  fontWeight: 'inherit',
                  textAlign: 'center',
                  border: '2px solid var(--violet)',
                  borderRadius: 6,
                  padding: '6px 10px',
                  marginBottom: '0.35rem',
                }}
                className="pf-name"
              />
              <div className="pf-handle-row">
                <span className="pf-handle">@{profile.username}</span>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button type="submit" disabled={saving}>
                  {saving ? '⏳ Guardando…' : '✓ Guardar'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                  ✕ Cancelar
                </button>
              </div>
            </div>
          </div>

          {/* Sección de mensaje */}
          <div className="pf-card pf-section">
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
              Sobre mí ({d.profileMessage.length}/100)
            </label>
            <textarea
              value={d.profileMessage}
              maxLength={100}
              onChange={(e) => setD((s) => ({ ...s, profileMessage: e.target.value }))}
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '8px',
                border: '2px solid var(--violet)',
                borderRadius: 6,
                fontFamily: 'inherit',
                fontSize: '0.9rem',
              }}
            />
          </div>

          {/* Avatar emoji selector (si no tiene imagen) */}
          {!d.avatarImage && (
            <div className="pf-card pf-section">
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
                Avatar emoji
              </label>
              <input
                type="text"
                value={d.avatar}
                onChange={(e) => setD((s) => ({ ...s, avatar: e.target.value }))}
                maxLength={2}
                style={{
                  width: '60px',
                  fontSize: '1.5rem',
                  textAlign: 'center',
                  padding: '8px',
                  border: '2px solid var(--violet)',
                  borderRadius: 6,
                }}
              />
            </div>
          )}

          {error && <div className="pf-wrap" style={{ color: 'var(--red)', marginTop: '1rem' }}>{error}</div>}
        </form>
      </div>
    )
  }

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
            ✏️ Editar
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
