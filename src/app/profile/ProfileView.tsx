'use client'
import { useState } from 'react'
import { ProfileLayout } from '@/components/profile/ProfileLayout'
import { BANNER_PRESETS, bannerCss } from '@/lib/users/banners'
import type { PublicProfile } from '@/lib/users/profileStats'

const EMOJI_LIST = [
  '🦊','🐱','🐶','🐸','🦁','🐯','🐻','🐼',
  '🐨','🦄','🐲','🦋','🐬','🦅','🐙','🦑',
  '🌟','⚡','🔥','❄️','🎮','🚀','🎸','🎨',
  '💎','🌈','🍕','🍔','🌮','🍣','☕','🎲',
  '🏆','💻','🤖','👾','🧩','🎯','🌙','🌊',
]

type Draft = {
  displayName: string
  avatar: string
  avatarImage: string | null
  profileMessage: string
  banner: string
  bannerImage: string | null
}

export function ProfileView({ profile }: { profile: PublicProfile }) {
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [avatar, setAvatar] = useState(profile.avatar)
  const [avatarImage, setAvatarImage] = useState<string | null>(profile.avatarImage ?? null)
  const [profileMessage, setProfileMessage] = useState(profile.profileMessage)
  const [banner, setBanner] = useState(profile.banner || 'preset:sunset')
  const [bannerImage, setBannerImage] = useState<string | null>(profile.bannerImage)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [bannerOpen, setBannerOpen] = useState(false)
  const [avatarModal, setAvatarModal] = useState(false)
  const [avatarTab, setAvatarTab] = useState<'emoji' | 'image'>('emoji')

  const [d, setD] = useState<Draft>({ displayName, avatar, avatarImage, profileMessage, banner, bannerImage })

  function openEdit() {
    setD({ displayName, avatar, avatarImage, profileMessage, banner, bannerImage })
    setError('')
    setBannerOpen(false)
    setEditing(true)
  }

  function onPickBannerFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!/^image\/(png|jpeg|jpg|webp|gif)$/.test(file.type)) { setError('Formato de imagen no válido.'); return }
    if (file.size > 500 * 1024) { setError('La imagen supera los 500 KB.'); return }
    const reader = new FileReader()
    reader.onload = () => setD((s) => ({ ...s, banner: 'upload', bannerImage: String(reader.result) }))
    reader.readAsDataURL(file)
    setBannerOpen(false)
  }

  function onPickAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!/^image\/(png|jpeg|jpg|webp|gif)$/.test(file.type)) { setError('Formato de imagen no válido.'); return }
    if (file.size > 500 * 1024) { setError('La imagen supera los 500 KB.'); return }
    const reader = new FileReader()
    reader.onload = () => { setD((s) => ({ ...s, avatarImage: String(reader.result) })); setAvatarModal(false) }
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
    if (!res.ok) { setError(data.error ?? 'No se pudo guardar.'); return }
    setDisplayName(d.displayName)
    setAvatar(d.avatar)
    setAvatarImage(d.avatarImage)
    setProfileMessage(d.profileMessage)
    setBanner(d.banner)
    setBannerImage(d.bannerImage)
    setEditing(false)
  }

  const local: PublicProfile = { ...profile, displayName, avatar, avatarImage, profileMessage, banner, bannerImage }

  if (editing) {
    return (
      <div className="pf-wrap">
        <form onSubmit={save}>
          {/* Hero — same visual structure as ProfileHero */}
          <div className="pf-card pf-hero">
            <div
              className="pf-banner pf-banner--edit"
              style={{ background: bannerCss(d.banner, d.bannerImage) }}
              onClick={() => setBannerOpen((v) => !v)}
            >
              <div className="pf-banner-edit-hint">📷 Cambiar banner</div>
            </div>

            <div className="pf-hero-row">
              <div
                className="pf-avatar pf-avatar--edit"
                onClick={() => { setAvatarTab('emoji'); setAvatarModal(true) }}
              >
                {d.avatarImage
                  ? <img src={d.avatarImage} alt={d.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : (d.avatar || '🦊')}
                <div className="pf-avatar-edit-overlay">✏️</div>
              </div>
              <div className="pf-hero-info">
                <div className="pf-name-row">
                  <input
                    className="pf-name--edit"
                    value={d.displayName}
                    onChange={(e) => setD((s) => ({ ...s, displayName: e.target.value }))}
                    maxLength={32}
                    aria-label="Nombre de display"
                  />
                </div>
                <span className="pf-handle">@{profile.username}</span>
              </div>
              <div className="pf-action">
                <button type="submit" className="btn-secondary" disabled={saving} style={{ padding: '6px 14px', fontSize: '.85rem' }}>
                  {saving ? '⏳' : '✓ Guardar'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => { setEditing(false); setBannerOpen(false) }} style={{ padding: '6px 14px', fontSize: '.85rem' }}>
                  ✕ Cancelar
                </button>
              </div>
            </div>
          </div>

          {/* Banner preset picker — slides in below hero card */}
          {bannerOpen && (
            <div className="pf-banner-picker">
              {BANNER_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={'pf-banner-swatch' + (d.banner === 'preset:' + p.id ? ' pf-banner-swatch--active' : '')}
                  style={{ background: p.css }}
                  onClick={() => { setD((s) => ({ ...s, banner: 'preset:' + p.id, bannerImage: null })); setBannerOpen(false) }}
                  title={p.label}
                />
              ))}
              <label className="pf-banner-swatch pf-banner-swatch--upload" title="Subir imagen">
                📷
                <input type="file" accept="image/*" onChange={onPickBannerFile} style={{ display: 'none' }} />
              </label>
            </div>
          )}

          {/* Profile message */}
          <div className="pf-card pf-section" style={{ marginTop: bannerOpen ? 0 : undefined }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
              Sobre mí ({d.profileMessage.length}/100)
            </label>
            <textarea
              className="pf-edit-textarea"
              value={d.profileMessage}
              maxLength={100}
              onChange={(e) => setD((s) => ({ ...s, profileMessage: e.target.value }))}
            />
          </div>

          {error && <p style={{ color: 'var(--red)', fontWeight: 700, marginTop: '0.5rem' }}>{error}</p>}
        </form>

        {/* Avatar modal */}
        {avatarModal && (
          <div className="pf-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setAvatarModal(false) }}>
            <div className="pf-modal">
              <div className="pf-modal-header">
                <span>Cambiar avatar</span>
                <button type="button" onClick={() => setAvatarModal(false)}>✕</button>
              </div>
              <div className="pf-modal-tabs">
                <button type="button" className={'pf-modal-tab' + (avatarTab === 'emoji' ? ' pf-modal-tab--active' : '')} onClick={() => setAvatarTab('emoji')}>
                  😀 Emoji
                </button>
                <button type="button" className={'pf-modal-tab' + (avatarTab === 'image' ? ' pf-modal-tab--active' : '')} onClick={() => setAvatarTab('image')}>
                  📷 Imagen
                </button>
              </div>
              {avatarTab === 'emoji' && (
                <div className="pf-emoji-grid">
                  {EMOJI_LIST.map((em) => (
                    <button
                      key={em}
                      type="button"
                      className={'pf-emoji-btn' + (!d.avatarImage && d.avatar === em ? ' pf-emoji-btn--active' : '')}
                      onClick={() => { setD((s) => ({ ...s, avatar: em, avatarImage: null })); setAvatarModal(false) }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}
              {avatarTab === 'image' && (
                <div className="pf-image-picker">
                  {d.avatarImage && (
                    <img src={d.avatarImage} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '50%', border: '3px solid var(--amber)' }} />
                  )}
                  <label className="pf-upload-label">
                    📷 Subir imagen
                    <input type="file" accept="image/*" onChange={onPickAvatarFile} style={{ display: 'none' }} />
                  </label>
                  {d.avatarImage && (
                    <button type="button" className="btn-secondary" style={{ fontSize: '0.85rem', padding: '6px 12px' }} onClick={() => setD((s) => ({ ...s, avatarImage: null }))}>
                      ✕ Quitar imagen
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <ProfileLayout
        profile={local}
        totalStars={profile.totalStars}
        challengesDone={profile.challengesDone}
        mastery={Object.fromEntries(profile.mastery.map((m) => [m.concept, m.pct]))}
        recentLessons={profile.recentLessons.map((l) => ({ id: l.slug, title: l.title, completedAt: l.completedAt, stars: l.stars }))}
        badges={profile.badges.map((b) => ({ ...b, title: b.label }))}
        action={
          <button type="button" className="btn-secondary" onClick={openEdit} style={{ padding: '6px 14px', fontSize: '.85rem' }}>
            ✏️ Editar
          </button>
        }
      />
    </>
  )
}
