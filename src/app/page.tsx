import Link from 'next/link'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { getCurrentUser } from '@/lib/session/server'

export default async function LandingPage() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))

  return (
    <main className="page--landing">
      <header className="landing-header">
        <div className="landing-header__brand">Fab Lab Quest 🦊</div>
        {user ? (
          <Link href="/dashboard" className="btn btn--small">Continuar aprendiendo →</Link>
        ) : (
          <Link href="/login" className="btn btn--small">Entrar</Link>
        )}
      </header>

      <section className="landing-hero">
        <div className="landing-hero__content">
          <div className="landing-hero__eyebrow">Aprende programando</div>
          <h1 className="landing-hero__headline">Del bloque de colores al código real</h1>
          <p className="landing-hero__subhead">
            Domina JavaScript, Python o Bloques visuales. Avanza a tu ritmo con retos que escalan en dificultad.
            Gana estrellas, desbloquea logros, conviértete en un desarrollador.
          </p>
          <div className="landing-hero__actions">
            <Link href="/login" className="btn btn--primary">
              Empezar gratis →
            </Link>
            <a href="#features" className="btn btn--secondary">
              Ver cómo funciona
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="landing-features">
        <div className="landing-features__grid">
          <div className="landing-feature-card">
            <div className="landing-feature-card__icon">🧩</div>
            <h3>Bloques visuales</h3>
            <p>Comienza sin escribir código. Arrastra y suelta bloques Scratch-style para entender la lógica de programación.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-card__icon">⭐</div>
            <h3>Retos con estrellas</h3>
            <p>Cada reto tiene múltiples partes con dificultad escalante. Gana estrellas y demuestra tu dominio.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-card__icon">🦊</div>
            <h3>Tu perfil propio</h3>
            <p>Personaliza tu avatar, ve tu progreso, cambios de lenguaje, y inspira a otros con tus logros.</p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>Fab Lab Quest © 2026. Aprende a crear, crea para aprender.</p>
      </footer>
    </main>
  )
}
