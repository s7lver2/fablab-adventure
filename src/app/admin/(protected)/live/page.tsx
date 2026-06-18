'use client'
import { useEffect, useState } from 'react'

interface ActiveStudent { userId: number; username: string; currentPath: string; lastSeenMs: number }
interface LiveEvent { timestamp: number; type: string; username: string; path: string }
interface LiveData { activeCount: number; activeStudents: ActiveStudent[]; recentEvents: LiveEvent[] }

function timeAgo(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)} min`
}

function slug(path: string) {
  const m = path.match(/\/challenge\/([^/?#]+)/)
  return m ? m[1] : (path.split('/').filter(Boolean).pop() ?? path)
}

function eventColor(type: string) {
  if (type.includes('pass') || type.includes('complete')) return 'var(--adm-success)'
  if (type.includes('fail') || type.includes('error')) return 'var(--adm-error)'
  if (type.includes('appeal')) return 'var(--adm-warning)'
  return 'var(--adm-accent)'
}

const AVATAR_BG = ['var(--adm-bg-secondary)', 'var(--adm-bg-secondary)', 'var(--adm-bg-secondary)', 'var(--adm-bg-secondary)']
const AVATAR_FG = ['var(--adm-accent)', 'var(--adm-success)', 'var(--adm-warning)', 'var(--adm-error)']

function sec(children: React.ReactNode) {
  return <div style={{ border: '1px solid var(--adm-border)', borderRadius: 'var(--adm-radius)', overflow: 'hidden' }}>{children}</div>
}

function sh(title: string, sub?: string) {
  return (
    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--adm-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--adm-text-primary)' }}>{title}</span>
      {sub && <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-tertiary)' }}>{sub}</span>}
    </div>
  )
}

export default function AdminLivePage() {
  const [data, setData] = useState<LiveData | null>(null)

  useEffect(() => {
    const load = () => fetch('/api/admin/live').then((r) => r.json()).then(setData)
    load()
    const id = setInterval(load, 10_000)
    return () => clearInterval(id)
  }, [])

  const topSlug = data?.activeStudents[0] ? slug(data.activeStudents[0].currentPath) : '—'

  return (
    <div style={{ padding: '1.25rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>actividad en vivo</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--adm-text-primary)' }}>En vivo</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-success)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
            {data?.activeCount ?? 0} activos · actualiza cada 10s
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, marginBottom: '1rem' }}>
        {[
          { label: 'ahora mismo', value: data?.activeCount ?? 0, delta: 'alumnos activos (últimos 5 min)' },
          { label: 'eventos recientes', value: data?.recentEvents.length ?? 0, delta: 'en ventana de 5 min' },
          { label: 'reto más activo', value: topSlug },
        ].map((k) => (
          <div key={k.label} style={{ background: 'var(--adm-bg-secondary)', borderRadius: 'var(--adm-radius-sm)', padding: '0.875rem' }}>
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-tertiary)', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 18, fontWeight: 500, color: 'var(--adm-text-primary)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.value}</div>
            {k.delta && <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-success)' }}>{k.delta}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {sec(<>
          {sh('Alumnos conectados', 'últimos 5 min')}
          {!data?.activeStudents.length && (
            <div style={{ padding: '1rem', fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-text-secondary)' }}>Sin actividad reciente</div>
          )}
          {data?.activeStudents.map((s, i) => (
            <div key={s.userId} style={{ padding: '0.55rem 1rem', borderBottom: '1px solid var(--adm-border)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--adm-success)', flexShrink: 0 }} />
              <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--adm-font-mono)', fontSize: 10, fontWeight: 500, background: AVATAR_BG[i % 4], color: AVATAR_FG[i % 4], flexShrink: 0 }}>
                {s.username.slice(0, 2).toUpperCase()}
              </div>
              <span style={{ flex: 1, fontWeight: 500, color: 'var(--adm-text-primary)' }}>{s.username}</span>
              <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-success)' }}>{slug(s.currentPath)}</span>
              <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-text-secondary)' }}>{timeAgo(s.lastSeenMs)}</span>
            </div>
          ))}
        </>)}

        {sec(<>
          {sh('Eventos en tiempo real')}
          <div style={{ padding: '0.5rem 1rem', fontFamily: 'var(--adm-font-mono)', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {!data?.recentEvents.length && <span style={{ color: 'var(--adm-text-secondary)' }}>Sin eventos recientes</span>}
            {data?.recentEvents.slice(0, 10).map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', overflow: 'hidden' }}>
                <span style={{ color: 'var(--adm-text-secondary)', flexShrink: 0 }}>{new Date(e.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                <span style={{ color: eventColor(e.type), flexShrink: 0 }}>{e.type.split(':').pop()?.toUpperCase() ?? e.type}</span>
                <span style={{ color: 'var(--adm-text-primary)', flexShrink: 0 }}>{e.username}</span>
                <span style={{ color: 'var(--adm-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>→ {slug(e.path)}</span>
              </div>
            ))}
          </div>
        </>)}
      </div>
    </div>
  )
}
