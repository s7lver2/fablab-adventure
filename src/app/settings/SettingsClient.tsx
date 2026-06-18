'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Language } from '@/lib/curriculum/types'

const LANGS: { value: Language; icon: string; label: string; desc: string }[] = [
  { value: 'blocks', icon: '🧩', label: 'Bloques', desc: 'Arrastra y suelta bloques visuales' },
  { value: 'js', icon: '⚡', label: 'JavaScript', desc: 'El lenguaje de la web' },
  { value: 'python', icon: '🐍', label: 'Python', desc: 'Sencillo y potente' },
]

export function SettingsClient({ currentLanguage }: { currentLanguage: Language | null }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Language | null>(currentLanguage)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!selected || selected === currentLanguage) return
    const willReset = currentLanguage !== null
    if (willReset) {
      const ok = confirm('⚠️ Cambiar de lenguaje borrará todo tu progreso actual. ¿Quieres continuar?')
      if (!ok) return
    }

    setSaving(true)
    setError('')
    try {
      if (willReset) {
        await fetch('/api/me/language', { method: 'DELETE' })
      }
      const res = await fetch('/api/me/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selected }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      router.push('/dashboard')
    } catch {
      setError('No se pudo guardar el lenguaje.')
      setSaving(false)
    }
  }

  return (
    <div className="settings-section">
      <h2 className="settings-section__title">Lenguaje de programación</h2>
      <p className="settings-section__desc">
        Elige cómo quieres aprender. Puedes cambiarlo más adelante, pero{' '}
        <strong>cambiar de lenguaje borrará tu progreso actual</strong>.
      </p>

      <div className="lang-cards">
        {LANGS.map((l) => (
          <button
            key={l.value}
            className={`lang-card${selected === l.value ? ' lang-card--active' : ''}`}
            onClick={() => setSelected(l.value)}
            type="button"
          >
            <span className="lang-card__icon">{l.icon}</span>
            <span className="lang-card__label">{l.label}</span>
            <span className="lang-card__desc">{l.desc}</span>
          </button>
        ))}
      </div>

      {error && <p style={{ color: 'var(--red, #ef4444)', fontSize: '0.9rem', marginTop: '0.75rem' }}>{error}</p>}

      <button
        onClick={save}
        disabled={saving || !selected || selected === currentLanguage}
        className="btn"
        style={{ marginTop: '1.5rem', width: '100%' }}
      >
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  )
}
