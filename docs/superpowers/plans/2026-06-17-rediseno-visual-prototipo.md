# Rediseño Visual + Selección de Lenguaje Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar el dashboard `/`, la página de lección `/challenge/[slug]`, implementar selección de lenguaje (JS / Python / Bloques) por usuario con reset de progreso, expandir el currículo a 16 retos en 4 conceptos, añadir motor Python (Skulpt), y corregir el bug 307 en `/admin/login`.

**Architecture:** Se añade `chosen_language` al usuario en DB; si no hay lenguaje elegido, la app redirige a `/onboarding`. El dashboard agrupa retos por concepto con barras de progreso. La página de lección se convierte en un split-panel client component. Los motores de ejecución se abstraen por lenguaje en `client.ts`.

**Tech Stack:** Next.js 16 App Router, React 19, better-sqlite3, Blockly 13, Skulpt (nuevo), TypeScript, Vitest.

## Global Constraints

- Node ≥ 20; Next.js 16 — leer `node_modules/next/dist/docs/` ante dudas de API
- SQLite con WAL; todas las migraciones son idempotentes (CREATE IF NOT EXISTS / try-catch ALTER TABLE)
- Nombre display: siempre `displayName` en TS, `display_name` en SQL
- Lenguajes válidos: `'js' | 'python' | 'blocks'` exactamente como en el `Language` type
- Skulpt solo soporta Python básico — los retos deben usar solo print, variables, bucles, funciones y aritmética
- Blocks genera código JS y usa el worker JS; no hay runner Blocks separado
- CSS sigue el sistema existente: warm gradient, tarjetas con sombra sólida, `--radius` / `--radius-sm`

---

## File Map

### Archivos que se crean
- `src/app/admin/(protected)/layout.tsx` — AdminLayout movido aquí
- `src/app/admin/(protected)/page.tsx` — admin dashboard movido
- `src/app/admin/(protected)/users/page.tsx` — admin users movido
- `src/app/admin/(protected)/analytics/page.tsx` — admin analytics movido
- `src/app/onboarding/page.tsx` — selector de lenguaje pre-curso
- `src/app/api/me/language/route.ts` — GET/POST/DELETE idioma del usuario
- `src/lib/engine/python-runner.ts` — runner síncrono Python con Skulpt
- `src/lib/engine/python-worker.ts` — worker que usa python-runner
- `src/lib/engine/skulpt.d.ts` — tipos locales de Skulpt si no hay paquete @types
- `src/components/ProgressBar.tsx` — barra de progreso reutilizable
- `src/components/ConceptSection.tsx` — sección de concepto en dashboard

### Archivos que se modifican
- `src/lib/db/schema.ts` — ALTER TABLE para columna `chosen_language`
- `src/lib/users/types.ts` — añadir `chosenLanguage: Language | null`
- `src/lib/users/repository.ts` — añadir `setLanguage()`
- `src/lib/curriculum/types.ts` — añadir `ConceptWithChallenges`
- `src/lib/curriculum/repository.ts` — añadir `listConceptsWithChallenges()`
- `src/lib/curriculum/seed.ts` — 16 retos, 4 conceptos, JS/Python/Blocks
- `src/lib/engine/client.ts` — añadir parámetro `language` y despacho por worker
- `src/app/page.tsx` — dashboard con conceptos + barras de progreso
- `src/app/challenge/[slug]/page.tsx` — split-panel redesign
- `src/app/api/challenges/[slug]/route.ts` — variante según lenguaje del usuario
- `src/app/profile/ProfileView.tsx` — botón "Cambiar lenguaje"
- `src/app/globals.css` — estilos para onboarding, challenge-page, panels

### Archivos que se eliminan (después de mover a `(protected)`)
- `src/app/admin/layout.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/users/page.tsx`
- `src/app/admin/analytics/page.tsx`

---

## Task 1: Fix admin 307 — Route Group

**Files:**
- Create: `src/app/admin/(protected)/layout.tsx`
- Create: `src/app/admin/(protected)/page.tsx`
- Create: `src/app/admin/(protected)/users/page.tsx`
- Create: `src/app/admin/(protected)/analytics/page.tsx`
- Delete: los 4 archivos originales tras mover

**Why it breaks:** `src/app/admin/layout.tsx` envuelve TODAS las rutas bajo `/admin/`, incluida `/admin/login`. Cuando un usuario sin sesión de admin visita `/admin/login`, el layout redirige a `/admin/login`, creando bucle 307 infinito. Route groups `(name)` no afectan URLs en Next.js App Router.

- [ ] **Step 1: Crear el directorio y mover layout**

Crear `src/app/admin/(protected)/layout.tsx` con el mismo contenido que el layout actual:
```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser(new UserRepository(getDb()))
  if (!isAdmin(user)) redirect('/admin/login')
  return (
    <div>
      <nav style={{ display: 'flex', gap: '1rem', padding: '0.75rem 1.5rem', borderBottom: '1px solid #2a2f3a' }}>
        <Link href="/admin">Resumen</Link>
        <Link href="/admin/users">Usuarios</Link>
        <Link href="/admin/appeals">Apelaciones</Link>
        <Link href="/admin/content">Contenido</Link>
        <Link href="/admin/analytics">Analítica</Link>
        <Link href="/admin/settings">Ajustes</Link>
      </nav>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Leer y mover las páginas protegidas**

Leer cada archivo original y recrearlo bajo `(protected)/`:
- `src/app/admin/page.tsx` → `src/app/admin/(protected)/page.tsx`
- `src/app/admin/users/page.tsx` → `src/app/admin/(protected)/users/page.tsx`
- `src/app/admin/analytics/page.tsx` → `src/app/admin/(protected)/analytics/page.tsx`

- [ ] **Step 3: Eliminar archivos originales**

```powershell
Remove-Item src/app/admin/layout.tsx
Remove-Item src/app/admin/page.tsx
Remove-Item src/app/admin/users/page.tsx
Remove-Item src/app/admin/analytics/page.tsx
```

- [ ] **Step 4: Verificar**

```bash
# Con el servidor corriendo:
curl -I http://localhost:3000/admin/login
# Expected: 200 OK (no 307)
```

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/
git commit -m "fix(admin): mover layout a route group (protected) para evitar 307 en /admin/login"
```

---

## Task 2: DB + UserRepository — campo `chosen_language`

**Files:**
- Modify: `src/lib/db/schema.ts`
- Modify: `src/lib/users/types.ts`
- Modify: `src/lib/users/repository.ts`
- Create: `src/lib/users/language.test.ts`

**Interfaces:**
- Produces: `User.chosenLanguage: Language | null`
- Produces: `UserRepository.setLanguage(userId: number, lang: Language): void`

- [ ] **Step 1: Escribir test fallido**

Crear `src/lib/users/language.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '@/lib/db/schema'
import { UserRepository } from '@/lib/users/repository'

describe('UserRepository language', () => {
  let db: Database.Database
  let repo: UserRepository

  beforeEach(() => {
    db = new Database(':memory:')
    createSchema(db)
    repo = new UserRepository(db)
  })

  it('chosenLanguage es null por defecto', () => {
    const user = repo.findOrCreateByUsername('tester')
    expect(user.chosenLanguage).toBeNull()
  })

  it('setLanguage persiste y findById lo refleja', () => {
    const user = repo.findOrCreateByUsername('tester')
    repo.setLanguage(user.id, 'js')
    expect(repo.findById(user.id)!.chosenLanguage).toBe('js')
  })

  it('acepta python y blocks', () => {
    const user = repo.findOrCreateByUsername('tester2')
    repo.setLanguage(user.id, 'python')
    expect(repo.findById(user.id)!.chosenLanguage).toBe('python')
    repo.setLanguage(user.id, 'blocks')
    expect(repo.findById(user.id)!.chosenLanguage).toBe('blocks')
  })
})
```

- [ ] **Step 2: Correr test para ver fallo**

```bash
npx vitest run src/lib/users/language.test.ts
# Expected: FAIL — chosenLanguage no existe
```

- [ ] **Step 3: Migrar schema**

En `src/lib/db/schema.ts`, añadir justo después de `db.exec(...)`:
```typescript
// Migración idempotente: añadir chosen_language si no existe
try {
  db.exec("ALTER TABLE users ADD COLUMN chosen_language TEXT")
} catch {
  // columna ya existe
}
```

- [ ] **Step 4: Actualizar tipo User**

En `src/lib/users/types.ts`, importar `Language` y añadir el campo:
```typescript
import type { Language } from '@/lib/curriculum/types'

// Dentro de interface User:
chosenLanguage: Language | null
```

- [ ] **Step 5: Actualizar `toUser` y añadir `setLanguage`**

En `src/lib/users/repository.ts`:

Añadir `chosen_language?: string | null` a la interfaz `UserRow` local.

En la función `toUser`, añadir:
```typescript
chosenLanguage: (row.chosen_language as Language | null) ?? null,
```

Añadir método a la clase `UserRepository`:
```typescript
setLanguage(userId: number, lang: Language): void {
  this.db
    .prepare('UPDATE users SET chosen_language = ? WHERE id = ?')
    .run(lang, userId)
}
```

- [ ] **Step 6: Correr test**

```bash
npx vitest run src/lib/users/language.test.ts
# Expected: PASS (3 tests)
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/schema.ts src/lib/users/types.ts src/lib/users/repository.ts src/lib/users/language.test.ts
git commit -m "feat(users): añadir chosen_language con migración idempotente"
```

---

## Task 3: API `/api/me/language` + Página Onboarding

**Files:**
- Create: `src/app/api/me/language/route.ts`
- Create: `src/app/onboarding/page.tsx`
- Modify: `src/app/page.tsx` (guard al inicio)

**Interfaces:**
- `GET /api/me/language` → `{ language: Language | null }`
- `POST /api/me/language` body `{ language: 'js'|'python'|'blocks' }` → `{ ok: true }`
- `DELETE /api/me/language` → `{ ok: true }` (también borra progreso — ver Task 10)

- [ ] **Step 1: Crear `src/app/api/me/language/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { getCurrentUser } from '@/lib/session/server'
import type { Language } from '@/lib/curriculum/types'

const VALID: Language[] = ['js', 'python', 'blocks']

export async function GET() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  return NextResponse.json({ language: user.chosenLanguage })
}

export async function POST(req: Request) {
  const db = getDb()
  const users = new UserRepository(db)
  const user = await getCurrentUser(users)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  const lang: unknown = body.language
  if (!VALID.includes(lang as Language)) {
    return NextResponse.json({ error: 'Lenguaje no válido' }, { status: 400 })
  }
  users.setLanguage(user.id, lang as Language)
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const db = getDb()
  const users = new UserRepository(db)
  const user = await getCurrentUser(users)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  db.prepare('DELETE FROM progress WHERE user_id = ?').run(user.id)
  db.prepare('UPDATE users SET chosen_language = NULL WHERE id = ?').run(user.id)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Crear `src/app/onboarding/page.tsx`**

```tsx
'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const LANGUAGES = [
  { id: 'blocks' as const, emoji: '🧩', name: 'Bloques', desc: 'Arrastra y suelta piezas visuales. ¡Ideal para empezar sin escribir código!' },
  { id: 'js' as const, emoji: '⚡', name: 'JavaScript', desc: 'El lenguaje de la web. Muy popular y muy potente.' },
  { id: 'python' as const, emoji: '🐍', name: 'Python', desc: 'Fácil de leer y escribir. Favorito de científicos y creadores.' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function choose(lang: 'blocks' | 'js' | 'python') {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/me/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      router.push('/')
    } catch {
      setError('Algo salió mal. Inténtalo de nuevo.')
      setLoading(false)
    }
  }

  return (
    <main className="page--narrow" style={{ padding: '1.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🚀</div>
        <h1>Elige tu lenguaje</h1>
        <p style={{ marginTop: '0.5rem' }}>
          Podrás cambiarlo después, pero tendrás que empezar el curso desde cero.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {LANGUAGES.map((l) => (
          <button
            key={l.id}
            onClick={() => choose(l.id)}
            disabled={loading}
            className="card"
            style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left', cursor: 'pointer', background: '#fff', width: '100%' }}
          >
            <span style={{ fontSize: '2.5rem', flexShrink: 0 }}>{l.emoji}</span>
            <div>
              <strong style={{ fontSize: '1.1rem', display: 'block' }}>{l.name}</strong>
              <p style={{ margin: 0, marginTop: '0.2rem', fontSize: '0.9rem' }}>{l.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {error && <p className="error" style={{ marginTop: '1rem' }}>{error}</p>}
    </main>
  )
}
```

- [ ] **Step 3: Añadir guard en `src/app/page.tsx`**

Justo después de `if (!user) redirect('/login')`, añadir:
```typescript
if (!user.chosenLanguage) redirect('/onboarding')
```

- [ ] **Step 4: Verificar flujo**

1. Crear usuario → llega a `/onboarding`
2. Elegir lenguaje → va a `/`
3. Visitar `/` con lenguaje → no redirige a `/onboarding`

- [ ] **Step 5: Commit**

```bash
git add src/app/api/me/language/ src/app/onboarding/ src/app/page.tsx
git commit -m "feat(onboarding): selector de lenguaje antes de empezar el curso"
```

---

## Task 4: Motor Python con Skulpt

**Files:**
- Create: `src/lib/engine/python-runner.ts`
- Create: `src/lib/engine/python-worker.ts`
- Create: `src/lib/engine/skulpt.d.ts` (si `@types/skulpt` no existe en npm)
- Modify: `src/lib/engine/client.ts`
- Install: `skulpt` npm package

**Interfaces:**
- Produces: `runPython(code: string, input: unknown): RunResult`
- Produces: `runInWorker(code, input, language: Language): Promise<RunResult>`

- [ ] **Step 1: Instalar Skulpt**

```bash
npm install skulpt
```

Verificar si existe `@types/skulpt` en npm:
```bash
npm install --save-dev @types/skulpt 2>/dev/null || echo "No hay @types/skulpt"
```

Si no existe, crear `src/lib/engine/skulpt.d.ts`:
```typescript
declare module 'skulpt' {
  const Sk: {
    configure: (opts: { output?: (text: string) => void; __future__?: unknown }) => void
    importMainWithBody: (name: string, dumpJS: boolean, code: string, canSuspend: boolean) => void
    python3: unknown
  }
  export default Sk
}
```

- [ ] **Step 2: Escribir test fallido**

Crear `src/lib/engine/python-runner.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { runPython } from './python-runner'

describe('runPython', () => {
  it('ejecuta print básico', () => {
    const result = runPython('print("Hola mundo")', null)
    expect(result.error).toBeUndefined()
    expect(result.output).toBe('Hola mundo')
  })

  it('accede a input como variable global', () => {
    const result = runPython('print(input["hasta"])', { hasta: 5 })
    expect(result.output).toBe('5')
  })

  it('bucle for range', () => {
    const result = runPython('for i in range(1, 4):\n    print(f"Hola {i}")', null)
    expect(result.output).toBe('Hola 1\nHola 2\nHola 3')
  })

  it('devuelve error en syntax error', () => {
    const result = runPython('def (', null)
    expect(result.error).toBeTruthy()
    expect(result.output).toBe('')
  })
})
```

- [ ] **Step 3: Correr test para ver fallo**

```bash
npx vitest run src/lib/engine/python-runner.test.ts
# Expected: FAIL — runPython no existe
```

- [ ] **Step 4: Crear `src/lib/engine/python-runner.ts`**

```typescript
import type { RunResult } from './js-runner'

type SkulptModule = {
  configure: (opts: { output?: (text: string) => void; __future__?: unknown }) => void
  importMainWithBody: (name: string, dumpJS: boolean, code: string, canSuspend: boolean) => void
  python3: unknown
}

function getSk(): SkulptModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('skulpt')
  return mod.default ?? mod
}

export function runPython(code: string, input: unknown): RunResult {
  const started = Date.now()
  const lines: string[] = []

  try {
    const Sk = getSk()
    Sk.configure({
      output: (text: string) => {
        // Skulpt emite '\n' por separado tras cada print; los filtramos
        if (text !== '\n') lines.push(text.replace(/\n$/, ''))
      },
      __future__: Sk.python3,
    })

    const injected = `input = ${JSON.stringify(input)}\n${code}`
    Sk.importMainWithBody('<alumno>', false, injected, false)

    return { output: lines.join('\n'), timeMs: Date.now() - started }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { output: '', error: friendlyPythonError(msg), timeMs: Date.now() - started }
  }
}

function friendlyPythonError(raw: string): string {
  if (/SyntaxError/i.test(raw))
    return 'Hay un error de sintaxis. Revisa paréntesis e indentación.'
  if (/NameError/i.test(raw)) {
    const name = raw.match(/name '(\w+)'/)?.[1]
    return `No reconozco "${name ?? 'algo'}". ¿Está mal escrito o aún no lo has creado?`
  }
  if (/IndentationError/i.test(raw))
    return 'La indentación no es correcta. Usa 4 espacios al entrar en un bloque.'
  return 'Tu programa tuvo un problema. Revisa el código e inténtalo de nuevo.'
}
```

- [ ] **Step 5: Correr test**

```bash
npx vitest run src/lib/engine/python-runner.test.ts
# Expected: PASS (4 tests)
```

- [ ] **Step 6: Crear `src/lib/engine/python-worker.ts`**

```typescript
import { runPython } from './python-runner'
import type { WorkerRequest } from './worker'

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { code, input } = e.data
  self.postMessage(runPython(code, input))
}
```

- [ ] **Step 7: Actualizar `src/lib/engine/client.ts`**

```typescript
import type { RunResult } from './js-runner'
import type { Language } from '@/lib/curriculum/types'

const TIMEOUT_MS = 3000

export function runInWorker(code: string, input: unknown, language: Language = 'js'): Promise<RunResult> {
  return new Promise((resolve) => {
    const workerUrl =
      language === 'python'
        ? new URL('./python-worker.ts', import.meta.url)
        : new URL('./worker.ts', import.meta.url)

    const worker = new Worker(workerUrl)
    const timer = setTimeout(() => {
      worker.terminate()
      resolve({
        output: '',
        error: 'Tu programa tardó demasiado. ¿Quizás hay un bucle que no termina?',
        timeMs: TIMEOUT_MS,
      })
    }, TIMEOUT_MS)

    worker.onmessage = (e: MessageEvent<RunResult>) => {
      clearTimeout(timer)
      worker.terminate()
      resolve(e.data)
    }
    worker.postMessage({ code, input })
  })
}
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/engine/ package.json package-lock.json
git commit -m "feat(engine): añadir motor Python con Skulpt"
```

---

## Task 5: Expansión del Currículo (16 retos, 4 conceptos)

**Files:**
- Modify: `src/lib/curriculum/seed.ts` — reemplazar completamente

**Scope:** 16 retos en 4 conceptos (Fundamentos ×5, Condicionales ×4, Bucles ×4, Funciones ×3). Cada reto tiene variante `js` y `python`. Los primeros 5 (Fundamentos) también tienen variante `blocks`. La semilla usa `settings.seed_version` para re-seedear en dev sin borrar usuarios ni progreso huérfano.

- [ ] **Step 1: Reemplazar `src/lib/curriculum/seed.ts`**

```typescript
import type Database from 'better-sqlite3'

const SEED_VERSION = 2

export function seedCurriculum(db: Database.Database): void {
  const versionRow = db.prepare("SELECT value FROM settings WHERE key = 'seed_version'").get() as
    | { value: string }
    | undefined
  if ((versionRow ? Number(versionRow.value) : 0) >= SEED_VERSION) return

  db.prepare('DELETE FROM challenge_variants').run()
  db.prepare('DELETE FROM test_cases').run()
  db.prepare('DELETE FROM challenges').run()
  db.prepare('DELETE FROM concepts').run()

  seedAll(db)

  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('seed_version', ?)").run(
    String(SEED_VERSION),
  )
}

function concept(db: Database.Database, slug: string, name: string, description: string, ord: number): number {
  return Number(
    db.prepare('INSERT INTO concepts (slug, name, description, ord) VALUES (?, ?, ?, ?)').run(slug, name, description, ord).lastInsertRowid,
  )
}

function challenge(db: Database.Database, conceptId: number, slug: string, title: string, narrative: string, ord: number): number {
  return Number(
    db.prepare('INSERT INTO challenges (concept_id, slug, title, narrative, ord) VALUES (?, ?, ?, ?, ?)').run(conceptId, slug, title, narrative, ord).lastInsertRowid,
  )
}

function variant(db: Database.Database, cid: number, lang: string, statement: string, starter: string, hints: string[]): void {
  db.prepare('INSERT INTO challenge_variants (challenge_id, language, statement, starter_code, hints_json) VALUES (?, ?, ?, ?, ?)').run(cid, lang, statement, starter, JSON.stringify(hints))
}

function tc(db: Database.Database, cid: number, input: unknown, expected: string, ord: number): void {
  db.prepare('INSERT INTO test_cases (challenge_id, input_json, expected_output, ord) VALUES (?, ?, ?, ?)').run(cid, JSON.stringify(input), expected, ord)
}

function seedAll(db: Database.Database): void {
  // ── Fundamentos ──────────────────────────────────────────────────────────────
  const fund = concept(db, 'fundamentos', 'Fundamentos', 'Primeros pasos en programación', 0)

  const r1 = challenge(db, fund, 'saludo', 'Tu primer saludo', 'El ordenador puede hablar. ¡Hazle decir hola al mundo!', 0)
  variant(db, r1, 'js', 'Imprime exactamente: Hola mundo', 'print("...")', ['Usa print("Hola mundo")'])
  variant(db, r1, 'python', 'Imprime exactamente: Hola mundo', 'print("...")', ['Usa print("Hola mundo")'])
  variant(db, r1, 'blocks', 'Usa el bloque "Imprimir" para mostrar: Hola mundo', '', ['Busca el bloque verde "imprimir" en la categoría Imprimir'])
  tc(db, r1, null, 'Hola mundo', 0)

  const r2 = challenge(db, fund, 'mi-nombre', 'Me presento', 'Las variables guardan información. ¡Guarda tu nombre y preséntate!', 1)
  variant(db, r2, 'js', 'Crea una variable llamada nombre con el valor "Mundo" e imprime: Hola, Mundo', 'let nombre = "..."\nprint("Hola, " + nombre)', ['Asigna nombre = "Mundo"'])
  variant(db, r2, 'python', 'Crea una variable llamada nombre con el valor "Mundo" e imprime: Hola, Mundo', 'nombre = "..."\nprint("Hola, " + nombre)', ['Asigna nombre = "Mundo"'])
  variant(db, r2, 'blocks', 'Crea una variable "nombre" con valor "Mundo" y usa el bloque imprimir', '', ['Usa el bloque Variables'])
  tc(db, r2, null, 'Hola, Mundo', 0)

  const r3 = challenge(db, fund, 'suma', 'La gran suma', 'Los ordenadores son geniales calculando. ¡Súmame estos dos números!', 2)
  variant(db, r3, 'js', 'Dados input.a e input.b, imprime su suma', 'print(input.a + input.b)', ['Accede con input.a e input.b'])
  variant(db, r3, 'python', 'Dados input["a"] e input["b"], imprime su suma', 'print(input["a"] + input["b"])', ['Accede con input["a"] e input["b"]'])
  variant(db, r3, 'blocks', 'Imprime la suma de input.a e input.b', '', ['Usa el bloque de Matemáticas'])
  tc(db, r3, { a: 3, b: 7 }, '10', 0)
  tc(db, r3, { a: 0, b: 0 }, '0', 1)
  tc(db, r3, { a: 100, b: 250 }, '350', 2)

  const r4 = challenge(db, fund, 'doble', 'El número doble', 'Multiplica un número por 2. ¡Parece fácil, pero la máquina nunca se equivoca!', 3)
  variant(db, r4, 'js', 'Dado input.n, imprime su doble (n × 2)', 'print(input.n * 2)', ['Multiplica con *'])
  variant(db, r4, 'python', 'Dado input["n"], imprime su doble', 'print(input["n"] * 2)', ['Multiplica con *'])
  variant(db, r4, 'blocks', 'Imprime input.n multiplicado por 2', '', ['Usa el bloque de Matemáticas para multiplicar'])
  tc(db, r4, { n: 5 }, '10', 0)
  tc(db, r4, { n: 0 }, '0', 1)
  tc(db, r4, { n: 7 }, '14', 2)

  const r5 = challenge(db, fund, 'contar', 'Cuenta hasta el final', 'Los bucles repiten acciones. ¡Cuenta desde 1 hasta el número que te doy!', 4)
  variant(db, r5, 'js', 'Imprime "Hola N" para cada N de 1 a input.hasta (incluido), uno por línea', 'for (let i = 1; i <= input.hasta; i++) {\n  print("Hola " + i)\n}', ['Usa un bucle for'])
  variant(db, r5, 'python', 'Imprime "Hola N" para cada N de 1 a input["hasta"] (incluido), uno por línea', 'for i in range(1, input["hasta"] + 1):\n    print(f"Hola {i}")', ['range(1, n+1) incluye 1 y excluye n+1'])
  variant(db, r5, 'blocks', 'Usa un bucle "contar" para imprimir Hola 1, Hola 2, … hasta input.hasta', '', ['Categoría Bucles: bloque "contar de 1 a"'])
  tc(db, r5, { hasta: 10 }, Array.from({ length: 10 }, (_, i) => `Hola ${i + 1}`).join('\n'), 0)
  tc(db, r5, { hasta: 1 }, 'Hola 1', 1)

  // ── Condicionales ─────────────────────────────────────────────────────────────
  const cond = concept(db, 'condicionales', 'Condicionales', 'Toma decisiones con if / else', 1)

  const r6 = challenge(db, cond, 'par-impar', 'Par o impar', '¿Es par o impar? El truco está en el resto de la división.', 0)
  variant(db, r6, 'js', 'Dado input.n, imprime "par" si es par, "impar" si no', 'if (input.n % 2 === 0) {\n  print("par")\n} else {\n  print("impar")\n}', ['El operador % da el resto; si n % 2 es 0, es par'])
  variant(db, r6, 'python', 'Dado input["n"], imprime "par" si es par, "impar" si no', 'if input["n"] % 2 == 0:\n    print("par")\nelse:\n    print("impar")', ['En Python if lleva : al final'])
  tc(db, r6, { n: 4 }, 'par', 0)
  tc(db, r6, { n: 7 }, 'impar', 1)
  tc(db, r6, { n: 0 }, 'par', 2)

  const r7 = challenge(db, cond, 'signo', 'El signo del número', 'Los números pueden ser positivos, negativos o cero. ¡Clasifícalos!', 1)
  variant(db, r7, 'js', 'Dado input.n, imprime "positivo", "negativo" o "cero"', 'if (input.n > 0) {\n  print("positivo")\n} else if (input.n < 0) {\n  print("negativo")\n} else {\n  print("cero")\n}', ['Usa if / else if / else para tres casos'])
  variant(db, r7, 'python', 'Dado input["n"], imprime "positivo", "negativo" o "cero"', 'n = input["n"]\nif n > 0:\n    print("positivo")\nelif n < 0:\n    print("negativo")\nelse:\n    print("cero")', ['elif es equivalente a else if'])
  tc(db, r7, { n: 5 }, 'positivo', 0)
  tc(db, r7, { n: -3 }, 'negativo', 1)
  tc(db, r7, { n: 0 }, 'cero', 2)

  const r8 = challenge(db, cond, 'mayor-dos', 'El campeón', '¿Quién es mayor? Compara dos números y di cuál es más grande.', 2)
  variant(db, r8, 'js', 'Dados input.a e input.b, imprime el mayor. Si son iguales, imprime cualquiera.', 'if (input.a >= input.b) {\n  print(input.a)\n} else {\n  print(input.b)\n}', ['Usa >='])
  variant(db, r8, 'python', 'Dados input["a"] e input["b"], imprime el mayor.', 'a, b = input["a"], input["b"]\nif a >= b:\n    print(a)\nelse:\n    print(b)', ['Puedes desempaquetar: a, b = ...'])
  tc(db, r8, { a: 8, b: 3 }, '8', 0)
  tc(db, r8, { a: 2, b: 9 }, '9', 1)
  tc(db, r8, { a: 5, b: 5 }, '5', 2)

  const r9 = challenge(db, cond, 'fizzbuzz', 'FizzBuzz', 'El reto clásico de los programadores. ¡Múltiplos de 3 y 5 tienen secretos!', 3)
  variant(db, r9, 'js', 'Imprime los números de 1 a input.hasta. Múltiplos de 3→"Fizz", de 5→"Buzz", de ambos→"FizzBuzz".', 'for (let i = 1; i <= input.hasta; i++) {\n  if (i % 15 === 0) print("FizzBuzz")\n  else if (i % 3 === 0) print("Fizz")\n  else if (i % 5 === 0) print("Buzz")\n  else print(i)\n}', ['Comprueba primero múltiplos de 15', 'Usa el operador %'])
  variant(db, r9, 'python', 'Imprime los números de 1 a input["hasta"]. Múltiplos de 3→"Fizz", de 5→"Buzz", de ambos→"FizzBuzz".', 'for i in range(1, input["hasta"] + 1):\n    if i % 15 == 0:\n        print("FizzBuzz")\n    elif i % 3 == 0:\n        print("Fizz")\n    elif i % 5 == 0:\n        print("Buzz")\n    else:\n        print(i)', ['Comprueba el caso de 15 primero'])
  tc(db, r9, { hasta: 15 }, ['1','2','Fizz','4','Buzz','Fizz','7','8','Fizz','Buzz','11','Fizz','13','14','FizzBuzz'].join('\n'), 0)
  tc(db, r9, { hasta: 3 }, '1\n2\nFizz', 1)

  // ── Bucles ────────────────────────────────────────────────────────────────────
  const loops = concept(db, 'bucles', 'Bucles', 'Repite acciones de forma eficiente', 2)

  const r10 = challenge(db, loops, 'suma-rango', 'La suma perfecta', 'Acumula los números de 1 hasta N. ¡Los bucles hacen el trabajo pesado!', 0)
  variant(db, r10, 'js', 'Imprime la suma de todos los números de 1 a input.n (incluido)', 'let suma = 0\nfor (let i = 1; i <= input.n; i++) {\n  suma = suma + i\n}\nprint(suma)', ['Usa una variable acumuladora inicializada a 0'])
  variant(db, r10, 'python', 'Imprime la suma de todos los números de 1 a input["n"] (incluido)', 'suma = 0\nfor i in range(1, input["n"] + 1):\n    suma = suma + i\nprint(suma)', ['Acumula antes del bucle'])
  tc(db, r10, { n: 5 }, '15', 0)
  tc(db, r10, { n: 10 }, '55', 1)
  tc(db, r10, { n: 1 }, '1', 2)

  const r11 = challenge(db, loops, 'tabla-multiplicar', 'La tabla del saber', 'Genera la tabla de multiplicar de cualquier número. ¡Del 1 al 10!', 1)
  variant(db, r11, 'js', 'Imprime la tabla de multiplicar de input.n del 1 al 10. Formato: "N x I = RESULTADO"', 'for (let i = 1; i <= 10; i++) {\n  print(input.n + " x " + i + " = " + (input.n * i))\n}', ['Combina strings y números con +'])
  variant(db, r11, 'python', 'Imprime la tabla de multiplicar de input["n"] del 1 al 10. Formato: "N x I = RESULTADO"', 'for i in range(1, 11):\n    n = input["n"]\n    print(f"{n} x {i} = {n * i}")', ['Usa f-strings: f"{n} x {i} = {n*i}"'])
  tc(db, r11, { n: 3 }, Array.from({ length: 10 }, (_, i) => `3 x ${i+1} = ${3*(i+1)}`).join('\n'), 0)
  tc(db, r11, { n: 1 }, Array.from({ length: 10 }, (_, i) => `1 x ${i+1} = ${i+1}`).join('\n'), 1)

  const r12 = challenge(db, loops, 'invertir', 'Al revés', 'Imprime los elementos de una lista en orden inverso.', 2)
  variant(db, r12, 'js', 'Dado input.items (array de números), imprímelos de mayor índice a menor, uno por línea.', 'for (let i = input.items.length - 1; i >= 0; i--) {\n  print(input.items[i])\n}', ['Empieza en items.length - 1', 'Decrementa con i--'])
  variant(db, r12, 'python', 'Dado input["items"] (lista de números), imprímelos en orden inverso, uno por línea.', 'items = input["items"]\nfor i in range(len(items) - 1, -1, -1):\n    print(items[i])', ['range(len-1, -1, -1) recorre al revés'])
  tc(db, r12, { items: [1, 2, 3] }, '3\n2\n1', 0)
  tc(db, r12, { items: [10, 20] }, '20\n10', 1)
  tc(db, r12, { items: [7] }, '7', 2)

  const r13 = challenge(db, loops, 'contar-pares', 'Solo los pares', 'Filtra y cuenta solo los números pares de una lista.', 3)
  variant(db, r13, 'js', 'Dado input.items, imprime solo los números pares, uno por línea.', 'for (let i = 0; i < input.items.length; i++) {\n  if (input.items[i] % 2 === 0) {\n    print(input.items[i])\n  }\n}', ['Combina un bucle con un condicional'])
  variant(db, r13, 'python', 'Dado input["items"], imprime solo los números pares, uno por línea.', 'for x in input["items"]:\n    if x % 2 == 0:\n        print(x)', ['Itera directamente con for x in lista'])
  tc(db, r13, { items: [1,2,3,4,5,6] }, '2\n4\n6', 0)
  tc(db, r13, { items: [1,3,5] }, '', 1)
  tc(db, r13, { items: [2,4] }, '2\n4', 2)

  // ── Funciones ─────────────────────────────────────────────────────────────────
  const funcs = concept(db, 'funciones', 'Funciones', 'Organiza tu código en bloques reutilizables', 3)

  const r14 = challenge(db, funcs, 'funcion-saludo', 'Mi primera función', 'Las funciones son como mini-programas que puedes llamar cuando quieras.', 0)
  variant(db, r14, 'js', 'Crea una función "saludar(nombre)" que retorne "Hola, NOMBRE!". Llámala con input.nombre e imprime el resultado.', 'function saludar(nombre) {\n  return "Hola, " + nombre + "!"\n}\nprint(saludar(input.nombre))', ['Define la función antes de llamarla', 'Usa return'])
  variant(db, r14, 'python', 'Crea una función "saludar(nombre)" que retorne "Hola, NOMBRE!". Llámala con input["nombre"] e imprime el resultado.', 'def saludar(nombre):\n    return "Hola, " + nombre + "!"\nprint(saludar(input["nombre"]))', ['En Python usa def'])
  tc(db, r14, { nombre: 'Ana' }, 'Hola, Ana!', 0)
  tc(db, r14, { nombre: 'Mundo' }, 'Hola, Mundo!', 1)

  const r15 = challenge(db, funcs, 'potencia', 'La potencia de los bucles', 'Calcula una potencia multiplicando repetidamente, sin usar funciones de ayuda.', 1)
  variant(db, r15, 'js', 'Crea "potencia(base, exp)" que retorne base^exp con un bucle. Imprime potencia(input.base, input.exp).', 'function potencia(base, exp) {\n  let resultado = 1\n  for (let i = 0; i < exp; i++) {\n    resultado = resultado * base\n  }\n  return resultado\n}\nprint(potencia(input.base, input.exp))', ['Multiplica base por sí misma "exp" veces', 'Empieza en 1'])
  variant(db, r15, 'python', 'Crea "potencia(base, exp)" que retorne base^exp con un bucle. Imprime potencia(input["base"], input["exp"]).', 'def potencia(base, exp):\n    resultado = 1\n    for i in range(exp):\n        resultado = resultado * base\n    return resultado\nprint(potencia(input["base"], input["exp"]))', ['range(exp) ejecuta el cuerpo exp veces'])
  tc(db, r15, { base: 2, exp: 10 }, '1024', 0)
  tc(db, r15, { base: 3, exp: 3 }, '27', 1)
  tc(db, r15, { base: 5, exp: 0 }, '1', 2)

  const r16 = challenge(db, funcs, 'es-primo', '¿Primo o no primo?', 'Los números primos son especiales: solo se dividen por 1 y por sí mismos.', 2)
  variant(db, r16, 'js', 'Crea "esPrimo(n)" que retorne true/false. Imprime "primo" o "no primo" para input.n.', 'function esPrimo(n) {\n  if (n < 2) return false\n  for (let i = 2; i * i <= n; i++) {\n    if (n % i === 0) return false\n  }\n  return true\n}\nprint(esPrimo(input.n) ? "primo" : "no primo")', ['Comprueba divisores hasta la raíz cuadrada', 'Si n < 2 no es primo'])
  variant(db, r16, 'python', 'Crea "es_primo(n)" que retorne True/False. Imprime "primo" o "no primo" para input["n"].', 'def es_primo(n):\n    if n < 2:\n        return False\n    i = 2\n    while i * i <= n:\n        if n % i == 0:\n            return False\n        i = i + 1\n    return True\nn = input["n"]\nprint("primo" if es_primo(n) else "no primo")', ['Comprueba hasta que i*i > n'])
  tc(db, r16, { n: 7 }, 'primo', 0)
  tc(db, r16, { n: 10 }, 'no primo', 1)
  tc(db, r16, { n: 2 }, 'primo', 2)
  tc(db, r16, { n: 1 }, 'no primo', 3)
}
```

- [ ] **Step 2: Verificar seed**

```bash
# Borrar DB para re-seedear:
Remove-Item data.sqlite, data.sqlite-shm, data.sqlite-wal -ErrorAction SilentlyContinue
npm run dev
# Navegar a / y verificar 16 retos en 4 conceptos
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/curriculum/seed.ts
git commit -m "feat(curriculum): expandir a 16 retos en 4 conceptos con variantes JS/Python/Blocks"
```

---

## Task 6: `CurriculumRepository.listConceptsWithChallenges()`

**Files:**
- Modify: `src/lib/curriculum/types.ts`
- Modify: `src/lib/curriculum/repository.ts`
- Modify: `src/lib/curriculum/repository.test.ts`

**Interfaces:**
- Produces: `ConceptWithChallenges { id, slug, name, description, ord, challenges: ChallengeSummary[] }`
- Produces: `CurriculumRepository.listConceptsWithChallenges(): ConceptWithChallenges[]`

- [ ] **Step 1: Escribir test fallido**

Añadir a `src/lib/curriculum/repository.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '@/lib/db/schema'
import { seedCurriculum } from '@/lib/curriculum/seed'
import { CurriculumRepository } from '@/lib/curriculum/repository'

describe('CurriculumRepository.listConceptsWithChallenges', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    createSchema(db)
    seedCurriculum(db)
  })

  it('retorna 4 conceptos', () => {
    const concepts = new CurriculumRepository(db).listConceptsWithChallenges()
    expect(concepts).toHaveLength(4)
  })

  it('el primer concepto tiene 5 retos', () => {
    const [first] = new CurriculumRepository(db).listConceptsWithChallenges()
    expect(first.challenges).toHaveLength(5)
  })

  it('los retos están ordenados por ord', () => {
    const [first] = new CurriculumRepository(db).listConceptsWithChallenges()
    const ords = first.challenges.map((c) => c.ord)
    expect(ords).toEqual([...ords].sort((a, b) => a - b))
  })
})
```

- [ ] **Step 2: Correr test para ver fallo**

```bash
npx vitest run src/lib/curriculum/repository.test.ts
# Expected: FAIL — listConceptsWithChallenges no existe
```

- [ ] **Step 3: Añadir tipo en `src/lib/curriculum/types.ts`**

```typescript
export interface ConceptWithChallenges {
  id: number
  slug: string
  name: string
  description: string
  ord: number
  challenges: ChallengeSummary[]
}
```

- [ ] **Step 4: Implementar método en `repository.ts`**

Añadir import del nuevo tipo e implementar:
```typescript
listConceptsWithChallenges(): ConceptWithChallenges[] {
  const concepts = this.db
    .prepare('SELECT id, slug, name, description, ord FROM concepts ORDER BY ord ASC')
    .all() as { id: number; slug: string; name: string; description: string; ord: number }[]

  return concepts.map((c) => ({
    ...c,
    challenges: this.db
      .prepare('SELECT id, slug, title, ord FROM challenges WHERE concept_id = ? ORDER BY ord ASC, id ASC')
      .all(c.id) as ChallengeSummary[],
  }))
}
```

- [ ] **Step 5: Correr test**

```bash
npx vitest run src/lib/curriculum/repository.test.ts
# Expected: PASS
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/curriculum/types.ts src/lib/curriculum/repository.ts src/lib/curriculum/repository.test.ts
git commit -m "feat(curriculum): añadir listConceptsWithChallenges para el dashboard"
```

---

## Task 7: Dashboard Rediseñado

**Files:**
- Create: `src/components/ProgressBar.tsx`
- Create: `src/components/ConceptSection.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `CurriculumRepository.listConceptsWithChallenges()`
- Consumes: `User.chosenLanguage`

- [ ] **Step 1: Crear `src/components/ProgressBar.tsx`**

```tsx
export function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="progress-bar">
      <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
    </div>
  )
}
```

- [ ] **Step 2: Crear `src/components/ConceptSection.tsx`**

```tsx
import Link from 'next/link'
import { StarRating } from './StarRating'
import { ProgressBar } from './ProgressBar'
import type { ChallengeSummary } from '@/lib/curriculum/types'

export function ConceptSection({
  name,
  challenges,
  completed,
  stars,
  next,
}: {
  name: string
  challenges: ChallengeSummary[]
  completed: Set<number>
  stars: Map<number, number>
  next: string | null
}) {
  const done = challenges.filter((c) => completed.has(c.id)).length
  const isUnlocked = done > 0 || challenges[0]?.slug === next
  return (
    <section className={`concept-section${!isUnlocked ? ' concept-section--locked' : ''}`}>
      <div className="concept-section__header">
        <h2>{name}</h2>
        <div className="concept-section__meta">
          <span className="concept-section__count">{done}/{challenges.length}</span>
          <ProgressBar done={done} total={challenges.length} />
        </div>
      </div>
      <ol className="challenge-list">
        {challenges.map((c, idx) => {
          const isDone = completed.has(c.id)
          const isCurrent = c.slug === next
          const state: 'done' | 'current' | 'future' = isDone ? 'done' : isCurrent ? 'current' : 'future'
          return (
            <li key={c.id}>
              <Link href={`/challenge/${c.slug}`} className={`challenge challenge--${state}`}>
                <span className="challenge__title">
                  <span className="challenge__num">{idx + 1}.</span>
                  {isDone && <span aria-label="completado">✅</span>}
                  {!isDone && !isCurrent && !isUnlocked && <span aria-label="bloqueado">🔒</span>}
                  {c.title}
                </span>
                {isDone ? (
                  <StarRating stars={stars.get(c.id) ?? 0} />
                ) : isCurrent ? (
                  <span className="challenge__cta">¡seguir! →</span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
```

- [ ] **Step 3: Reescribir `src/app/page.tsx`**

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { CurriculumRepository } from '@/lib/curriculum/repository'
import { ProgressRepository } from '@/lib/progress/repository'
import { getCurrentUser } from '@/lib/session/server'
import { nextChallengeSlug } from '@/lib/progress/next'
import { AppBar } from '@/components/AppBar'
import { StatCard } from '@/components/StatCard'
import { ConceptSection } from '@/components/ConceptSection'

const LANG_LABEL: Record<string, string> = {
  js: '⚡ JavaScript',
  python: '🐍 Python',
  blocks: '🧩 Bloques',
}

export default async function HomePage() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!user) redirect('/login')
  if (!user.chosenLanguage) redirect('/onboarding')

  const curriculum = new CurriculumRepository(db)
  const progress = new ProgressRepository(db)
  const concepts = curriculum.listConceptsWithChallenges()
  const allChallenges = concepts.flatMap((c) => c.challenges)
  const completed = new Set(progress.completedChallengeIds(user.id))
  const next = nextChallengeSlug(allChallenges, [...completed])

  const starsById = new Map<number, number>()
  for (const c of allChallenges) {
    starsById.set(c.id, progress.get(user.id, c.id)?.stars ?? 0)
  }
  const totalStars = [...starsById.values()].reduce((a, b) => a + b, 0)
  const challengesDone = completed.size
  const nextChallenge = allChallenges.find((c) => c.slug === next)

  return (
    <main className="page">
      <AppBar avatar={user.avatar} displayName={user.displayName} />

      <div className="greeting">
        <div>
          <h1>¡Hola, {user.displayName}!</h1>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 700 }}>
            {user.chosenLanguage ? LANG_LABEL[user.chosenLanguage] : ''}
          </span>
        </div>
      </div>

      <div className="stats-row">
        <StatCard label="Estrellas" value={`⭐ ${totalStars}`} />
        <StatCard label="Completados" value={`🏆 ${challengesDone}`} />
        <StatCard
          label="Progreso"
          value={`${allChallenges.length > 0 ? Math.round((challengesDone / allChallenges.length) * 100) : 0}%`}
        />
      </div>

      {next && nextChallenge && (
        <div className="mission">
          <div>
            <h2>Siguiente misión</h2>
            <p>{nextChallenge.title}</p>
          </div>
          <Link href={`/challenge/${next}`} className="btn">¡Jugar!</Link>
        </div>
      )}

      {!next && challengesDone > 0 && (
        <div className="mission" style={{ borderColor: 'var(--green)', boxShadow: '0 5px 0 var(--green-dark)' }}>
          <div>
            <h2>🎉 ¡Curso completado!</h2>
            <p>Has terminado todos los retos. ¡Eres increíble!</p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
        {concepts.map((concept) => (
          <ConceptSection
            key={concept.id}
            name={concept.name}
            challenges={concept.challenges}
            completed={completed}
            stars={starsById}
            next={next}
          />
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Añadir estilos al final de `src/app/globals.css`**

```css
/* Barra de progreso */
.progress-bar {
  height: 8px;
  background: #f0e6e6;
  border-radius: 999px;
  overflow: hidden;
  width: 80px;
}

.progress-bar__fill {
  height: 100%;
  background: var(--green);
  border-radius: 999px;
  transition: width 0.3s ease;
}

/* Sección de concepto en dashboard */
.concept-section {
  background: var(--card);
  border: 3px solid var(--violet);
  border-radius: var(--radius);
  box-shadow: 0 5px 0 var(--violet-dark);
  padding: 1.25rem;
}

.concept-section--locked {
  border-color: #ddd;
  box-shadow: 0 5px 0 #ccc;
  opacity: 0.6;
}

.concept-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.concept-section__meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.concept-section__count {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-dim);
  white-space: nowrap;
}

.challenge__num {
  color: var(--text-dim);
  font-weight: 700;
  margin-right: 0.25rem;
}
```

- [ ] **Step 5: Verificar en el navegador**

```bash
npm run dev
# http://localhost:3000 — verificar 4 secciones, barras de progreso, stats cards, misión
```

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/components/ProgressBar.tsx src/components/ConceptSection.tsx src/app/globals.css
git commit -m "feat(dashboard): rediseñar home con conceptos, barras de progreso y stats"
```

---

## Task 8: Challenge API — Variante por Lenguaje

**Files:**
- Modify: `src/app/api/challenges/[slug]/route.ts`

**Change:** Leer `user.chosenLanguage` y devolver la variante correspondiente. Blocks usa la variante `blocks` si existe, con fallback a `js` para ejecución.

- [ ] **Step 1: Reemplazar contenido de `src/app/api/challenges/[slug]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { CurriculumRepository } from '@/lib/curriculum/repository'
import { getCurrentUser } from '@/lib/session/server'
import { EventLogger } from '@/lib/analytics/events'
import { recordEvent } from '@/lib/analytics/record'
import type { Language } from '@/lib/curriculum/types'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const db = getDb()
  const repo = new CurriculumRepository(db)
  const challenge = repo.getChallengeBySlug(slug)
  if (!challenge) return NextResponse.json({ error: 'Reto no encontrado.' }, { status: 404 })

  const user = await getCurrentUser(new UserRepository(db))
  const lang: Language = user?.chosenLanguage ?? 'js'

  await recordEvent(new EventLogger(db), {
    type: 'open_challenge',
    path: `/api/challenges/${slug}`,
    meta: { slug },
  })

  const variant = challenge.variants[lang] ?? challenge.variants.js ?? null

  return NextResponse.json({
    slug: challenge.slug,
    title: challenge.title,
    narrative: challenge.narrative,
    language: lang,
    variant,
    inputs: challenge.testCases.map((tc) => tc.input),
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/challenges/[slug]/route.ts
git commit -m "feat(api): devolver variante de reto según lenguaje elegido por el usuario"
```

---

## Task 9: Página de Lección — Split Panel

**Files:**
- Modify: `src/app/challenge/[slug]/page.tsx`
- Modify: `src/app/globals.css`

**Design:** Página full-width con top bar + dos paneles redondeados 50/50. Panel izquierdo: narrativa, enunciado, editor (textarea o Blockly). Panel derecho: consola de salida, test cases, botón enviar. Los datos de lenguaje vienen del API (Task 8).

- [ ] **Step 1: Reescribir `src/app/challenge/[slug]/page.tsx`**

```tsx
'use client'
import { useEffect, useState, use, useCallback } from 'react'
import Link from 'next/link'
import { runInWorker } from '@/lib/engine/client'
import { BlocklyEditor } from './BlocklyEditor'
import type { Language } from '@/lib/curriculum/types'

interface ChallengeData {
  slug: string
  title: string
  narrative: string
  language: Language
  variant: { statement: string; starterCode: string; hints: string[] } | null
  inputs: unknown[]
}

export default function ChallengePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [data, setData] = useState<ChallengeData | null>(null)
  const [code, setCode] = useState('')
  const [consoleOut, setConsoleOut] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [testCount, setTestCount] = useState(0)
  const [score, setScore] = useState<{ correct: boolean; stars: number } | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [hintText, setHintText] = useState('')
  const [running, setRunning] = useState(false)

  useEffect(() => {
    fetch(`/api/challenges/${slug}`)
      .then((r) => r.json())
      .then((d: ChallengeData) => {
        setData(d)
        setTestCount(d.inputs.length)
        if (d.language !== 'blocks') setCode(d.variant?.starterCode ?? '')
      })
  }, [slug])

  const handleCodeChange = useCallback((c: string) => setCode(c), [])

  const execLang = (lang: Language) => (lang === 'blocks' ? 'js' : lang)

  async function run() {
    if (!data?.inputs[0] === undefined || !data) return
    setRunning(true)
    const res = await runInWorker(code, data.inputs[0], execLang(data.language))
    setConsoleOut(res.error ?? res.output)
    setRunning(false)
  }

  async function submit() {
    if (!data) return
    setRunning(true)
    const outputs: string[] = []
    for (const input of data.inputs) {
      const res = await runInWorker(code, input, execLang(data.language))
      outputs.push(res.error ? '' : res.output)
    }
    const res = await fetch(`/api/challenges/${slug}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputs, hintsUsed }),
    })
    const json = await res.json()
    setScore({ correct: json.correct, stars: json.stars })
    setSubmitted(true)
    setRunning(false)
  }

  function showHint() {
    if (!data?.variant?.hints?.length) return
    const idx = Math.min(hintsUsed, data.variant.hints.length - 1)
    setHintText(data.variant.hints[idx])
    setHintsUsed((n) => Math.min(n + 1, data!.variant!.hints.length))
  }

  if (!data) {
    return (
      <div className="challenge-page challenge-page--loading">
        <p>Cargando…</p>
      </div>
    )
  }

  if (!data.variant) {
    return (
      <div className="challenge-page challenge-page--loading">
        <p>Este reto no tiene versión disponible para tu lenguaje.</p>
        <Link href="/" className="btn" style={{ marginTop: '1rem' }}>← Volver</Link>
      </div>
    )
  }

  const isBlocks = data.language === 'blocks'
  const hasHints = (data.variant.hints?.length ?? 0) > 0

  return (
    <div className="challenge-page">
      <header className="challenge-topbar">
        <Link href="/" className="challenge-topbar__back">← Volver</Link>
        <h1 className="challenge-topbar__title">{data.title}</h1>
        {score && (
          <span className="chip" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            {'★'.repeat(score.stars)}{'☆'.repeat(3 - score.stars)}
          </span>
        )}
      </header>

      <div className="challenge-split">
        {/* Panel izquierdo */}
        <div className="panel panel--code">
          <div className="panel__section">
            <p className="panel__heading">📋 Misión</p>
            <p style={{ marginTop: '0.4rem' }}>{data.narrative}</p>
            <p style={{ marginTop: '0.5rem', fontWeight: 700, color: 'var(--text)' }}>
              {data.variant.statement}
            </p>
          </div>

          <div className="panel__section panel__section--grow">
            <p className="panel__heading">✏️ Tu código</p>
            {isBlocks ? (
              <BlocklyEditor onCodeChange={handleCodeChange} />
            ) : (
              <textarea
                className="code-editor"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
              />
            )}
          </div>

          <div className="panel__actions">
            <button onClick={run} disabled={running} className="btn">
              {running ? 'Ejecutando…' : '▶ Ejecutar'}
            </button>
            {hasHints && (
              <button onClick={showHint} disabled={running} className="btn btn-secondary">
                💡 Pista
              </button>
            )}
          </div>

          {hintText && <p className="hint-box">{hintText}</p>}
        </div>

        {/* Panel derecho */}
        <div className="panel panel--viewport">
          <div className="panel__section">
            <p className="panel__heading">▶ Salida</p>
            <pre className="console-out">
              {consoleOut || <span style={{ opacity: 0.4 }}>Aquí verás el resultado…</span>}
            </pre>
          </div>

          {testCount > 0 && (
            <div className="panel__section">
              <p className="panel__heading">🧪 Casos de prueba</p>
              <ul className="test-list">
                {Array.from({ length: testCount }, (_, i) => (
                  <li key={i} className="test-item">
                    <span className="test-item__icon">⬜</span>
                    <span className="test-item__label">Caso {i + 1}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {score && (
            <div className={`result-banner ${score.correct ? 'result-banner--ok' : 'result-banner--fail'}`}>
              {score.correct
                ? `🎉 ¡Correcto! ${'★'.repeat(score.stars)}`
                : '❌ Aún no es correcto. ¡Sigue intentando!'}
            </div>
          )}

          <div className="panel__actions panel__actions--submit">
            <button onClick={submit} disabled={running} className="btn" style={{ flex: 1 }}>
              {running ? 'Comprobando…' : '🚀 Enviar solución'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Añadir estilos al final de `globals.css`**

```css
/* ── Página de lección (split panel) ─────────────────────────── */
.challenge-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 0.75rem;
  gap: 0.75rem;
}

.challenge-page--loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 1rem;
  min-height: 60vh;
}

.challenge-topbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.challenge-topbar__back {
  font-weight: 800;
  color: var(--violet-dark);
  white-space: nowrap;
  flex-shrink: 0;
}

.challenge-topbar__title {
  flex: 1;
  font-size: 1.1rem;
  font-weight: 900;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.challenge-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  flex: 1;
  min-height: 0;
}

.panel {
  background: var(--card);
  border: 3px solid var(--violet);
  border-radius: var(--radius);
  box-shadow: 0 5px 0 var(--violet-dark);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.panel--viewport {
  border-color: var(--amber);
  box-shadow: 0 5px 0 var(--amber-dark);
}

.panel__section {
  padding: 0.85rem 1rem;
  border-bottom: 2px solid #f0e6e6;
  flex-shrink: 0;
}

.panel__section--grow {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-bottom: none;
}

.panel__heading {
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 0.4rem;
}

.panel__actions {
  padding: 0.6rem 1rem;
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
  border-top: 2px solid #f0e6e6;
}

.panel__actions--submit {
  margin-top: auto;
}

.code-editor {
  flex: 1;
  font-family: 'Fira Code', 'Cascadia Code', 'Courier New', monospace;
  font-size: 0.88rem;
  line-height: 1.6;
  background: #1e1e2e;
  color: #cdd6f4;
  border: none;
  border-radius: 0;
  padding: 0.75rem;
  resize: none;
  min-height: 0;
  width: 100%;
}

.code-editor:focus {
  outline: none;
  box-shadow: none;
  border-color: transparent;
}

.console-out {
  background: #1e1e2e;
  color: #a6e3a1;
  border-radius: var(--radius-sm);
  padding: 0.65rem 0.75rem;
  font-family: 'Fira Code', monospace;
  font-size: 0.82rem;
  min-height: 70px;
  max-height: 180px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.test-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-top: 0.4rem;
}

.test-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.88rem;
}

.test-item__label {
  font-weight: 700;
  color: var(--text-dim);
}

.result-banner {
  margin: 0 1rem 0.5rem;
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-sm);
  font-weight: 800;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.result-banner--ok {
  background: #d1fae5;
  color: var(--green-dark);
  border: 2px solid var(--green);
}

.result-banner--fail {
  background: #fee2e2;
  color: #dc2626;
  border: 2px solid #fca5a5;
}

.hint-box {
  margin: 0 1rem 0.5rem;
  padding: 0.6rem 0.85rem;
  background: #fef3c7;
  border: 2px solid var(--amber);
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
  color: #92400e;
  font-weight: 600;
  flex-shrink: 0;
}
```

- [ ] **Step 3: Verificar layout**

```bash
npm run dev
# http://localhost:3000/challenge/saludo
# Verificar: dos paneles, editor funcional, consola, casos, enviar
```

- [ ] **Step 4: Commit**

```bash
git add src/app/challenge/ src/app/globals.css
git commit -m "feat(lesson): redesign página de reto con split panel código/viewport"
```

---

## Task 10: Perfil — Botón "Cambiar lenguaje"

**Files:**
- Modify: `src/app/profile/ProfileView.tsx`

**Note:** `DELETE /api/me/language` ya fue creado en Task 3.

- [ ] **Step 1: Leer `src/app/profile/ProfileView.tsx` para entender su estructura**

- [ ] **Step 2: Añadir estado y botón de reset**

Dentro del componente, añadir:

Estado adicional (junto a los existentes):
```typescript
const [resetting, setResetting] = useState(false)
```

Función:
```typescript
async function resetLanguage() {
  if (!confirm('¿Seguro? Esto borrará todo tu progreso y podrás elegir otro lenguaje desde cero.')) return
  setResetting(true)
  await fetch('/api/me/language', { method: 'DELETE' })
  window.location.href = '/onboarding'
}
```

En el JSX, al final del contenido (antes del cierre del contenedor principal):
```tsx
<button
  onClick={resetLanguage}
  disabled={resetting}
  className="btn btn-secondary"
  style={{ marginTop: '1.5rem', width: '100%' }}
>
  {resetting ? 'Reiniciando…' : '🔄 Cambiar lenguaje (borra progreso)'}
</button>
```

- [ ] **Step 3: Verificar flujo completo**

1. Hacer un reto → ver progreso en dashboard
2. Ir a perfil → pulsar "Cambiar lenguaje" → confirmar
3. Llega a `/onboarding` → elegir otro lenguaje
4. Verificar que el progreso se ha borrado (dashboard en cero)

- [ ] **Step 4: Commit**

```bash
git add src/app/profile/ProfileView.tsx
git commit -m "feat(profile): añadir botón para cambiar lenguaje con reset de progreso"
```

---

## Self-Review

**Spec coverage:**
- ✅ Fix admin 307 → Task 1
- ✅ Dashboard con lecciones y progreso → Tasks 6 + 7
- ✅ 16 lecciones completas → Task 5
- ✅ Layout split panel código/viewport → Task 9
- ✅ Selección de lenguaje antes del curso → Task 3
- ✅ 3 lenguajes (JS/Python/Blocks) en lecciones → Tasks 4 + 5 + 8
- ✅ Reset de lenguaje borra progreso → Task 3 (DELETE) + Task 10 (botón)

**Placeholder scan:** Ningún "TBD" o "TODO".

**Type consistency:**
- `Language = 'js' | 'python' | 'blocks'` — consistente en todos los tasks
- `ConceptWithChallenges` definido en Task 6, consumido en Task 7
- `user.chosenLanguage: Language | null` definido en Task 2, consumido en Tasks 3, 7, 8
- `runInWorker(code, input, language)` definido en Task 4, consumido en Task 9
- `listConceptsWithChallenges()` definido en Task 6, consumido en Task 7
- `UserRepository.setLanguage()` definido en Task 2, consumido en Task 3
