# Hito A — Bucle de aprendizaje — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el bucle de aprendizaje de punta a punta: un alumno entra con su nombre de usuario, ve un currículo lineal, resuelve un reto escribiendo JavaScript en el navegador, el servidor valida la salida y le da estrellas, y su progreso queda guardado.

**Architecture:** Next.js (App Router) + TypeScript en un único proceso local. SQLite (better-sqlite3) como base de datos en un fichero local. El código del alumno se ejecuta SOLO en el navegador (Web Worker aislado con timeout); el servidor nunca ejecuta código del alumno, solo compara la salida producida contra una salida esperada que únicamente él conoce. La sesión es una cookie firmada con HMAC.

**Tech Stack:** Next.js 15, React 19, TypeScript, better-sqlite3, Vitest (tests), Node `crypto` (firma de cookies), Web Workers (motor JS).

**Alcance de este hito (del spec §12, Hito A):** auth por nombre de usuario + perfil + UN motor (JavaScript) + validación con entradas FIJAS + currículo LINEAL mínimo. NO incluye: Bloques, Python, entradas aleatorias, grafo con ramas por estrellas, apelaciones ni panel admin (esos son hitos B–D).

---

## Convenciones

- Gestor de paquetes: **npm**.
- Todos los comandos se ejecutan desde la raíz del repo `E:\fablableon-coding`.
- Tests con **Vitest**; los ficheros de test viven junto al código en `*.test.ts`.
- Commits frecuentes (uno por tarea como mínimo). Mensajes en español, prefijo convencional (`feat:`, `test:`, `chore:`).

## Estructura de ficheros (se crean en este hito)

```
package.json, tsconfig.json, next.config.ts, vitest.config.ts   ← scaffold
src/lib/db/connection.ts        ← abre/crea la BD SQLite (singleton)
src/lib/db/schema.ts            ← crea tablas + siembra root
src/lib/users/types.ts          ← tipo User y Role
src/lib/users/repository.ts     ← alta/búsqueda/actualización de usuarios
src/lib/users/profile.ts        ← validación de perfil (mensaje ≤100, etc.)
src/lib/session/cookie.ts       ← firmar/verificar cookie de sesión (HMAC)
src/lib/session/server.ts       ← leer/escribir sesión con cookies de Next
src/lib/curriculum/types.ts     ← tipos Concept/Challenge/Variant/TestCase
src/lib/curriculum/repository.ts← lectura del currículo
src/lib/curriculum/seed.ts      ← siembra currículo lineal mínimo
src/lib/progress/repository.ts  ← progreso por usuario+reto
src/lib/progress/next.ts        ← siguiente lección (lineal)
src/lib/grading/stars.ts        ← cálculo de estrellas
src/lib/grading/validate.ts     ← normalización + comparación de salida
src/lib/engine/js-runner.ts     ← ejecución JS (core puro) + formato de errores
src/lib/engine/worker.ts        ← Web Worker que envuelve js-runner con timeout
src/lib/engine/client.ts        ← API cliente para hablar con el worker
src/app/api/auth/login/route.ts ← POST login por username
src/app/api/auth/logout/route.ts← POST logout
src/app/api/me/route.ts         ← GET usuario actual, PATCH perfil
src/app/api/challenges/[slug]/route.ts        ← GET reto (entradas, sin solución)
src/app/api/challenges/[slug]/submit/route.ts ← POST salida → estrellas + progreso
src/app/login/page.tsx          ← pantalla de login
src/app/page.tsx                ← currículo lineal + sugerencia siguiente
src/app/profile/page.tsx        ← perfil (ver + editar)
src/app/challenge/[slug]/page.tsx ← editor + ejecutar + enviar
```

Principio: una responsabilidad por fichero; la lógica pura (validación, estrellas, runner, cookie) se separa de las rutas para poder testearla sin servidor.

---

### Task 1: Scaffold del proyecto

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`
- Test: `src/lib/smoke.test.ts`

- [ ] **Step 1: Crear el proyecto Next.js**

Run:
```bash
npx create-next-app@latest . --typescript --app --no-tailwind --no-eslint --src-dir --import-alias "@/*" --use-npm --yes
```
Expected: crea `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/`. Si pregunta por sobrescribir, acepta (el repo solo tiene `docs/` y `.gitignore`).

- [ ] **Step 2: Instalar dependencias del hito**

Run:
```bash
npm install better-sqlite3
npm install -D vitest @types/better-sqlite3 @types/node
```
Expected: se añaden a `package.json` sin errores.

- [ ] **Step 3: Configurar Vitest**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: true,
  },
})
```

Modify `package.json` scripts (añadir):
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 4: Escribir un test smoke que falle**

Create `src/lib/smoke.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('suma básica funciona (toolchain de test viva)', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Ejecutar tests**

Run: `npm test`
Expected: PASS (1 test). Confirma que Vitest está operativo.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + TypeScript + Vitest"
```

---

### Task 2: Conexión a SQLite y esquema

**Files:**
- Create: `src/lib/db/connection.ts`, `src/lib/db/schema.ts`
- Test: `src/lib/db/schema.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Create `src/lib/db/schema.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from './schema'

describe('createSchema', () => {
  it('crea las tablas esperadas', () => {
    const db = new Database(':memory:')
    createSchema(db)
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r: any) => r.name)
    expect(tables).toEqual(
      expect.arrayContaining([
        'users', 'concepts', 'challenges', 'challenge_variants',
        'test_cases', 'progress', 'settings',
      ]),
    )
  })

  it('siembra una cuenta root oculta y admin', () => {
    const db = new Database(':memory:')
    createSchema(db)
    const root: any = db.prepare("SELECT * FROM users WHERE username = 'root'").get()
    expect(root).toBeTruthy()
    expect(root.role).toBe('root')
    expect(root.hidden).toBe(1)
    expect(root.password_hash).toBeTruthy()
  })
})
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `npm test -- schema`
Expected: FAIL ("Cannot find module './schema'").

- [ ] **Step 3: Implementar el esquema**

Create `src/lib/db/schema.ts`:
```typescript
import type Database from 'better-sqlite3'
import { createHash } from 'node:crypto'

export function createSchema(db: Database.Database): void {
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      avatar TEXT NOT NULL DEFAULT '',
      profile_message TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user',
      hidden INTEGER NOT NULL DEFAULT 0,
      password_hash TEXT,
      created_at INTEGER NOT NULL,
      last_seen INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS concepts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      ord INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      concept_id INTEGER NOT NULL REFERENCES concepts(id),
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      narrative TEXT NOT NULL DEFAULT '',
      ord INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS challenge_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenge_id INTEGER NOT NULL REFERENCES challenges(id),
      language TEXT NOT NULL,
      statement TEXT NOT NULL,
      starter_code TEXT NOT NULL DEFAULT '',
      hints_json TEXT NOT NULL DEFAULT '[]',
      UNIQUE(challenge_id, language)
    );
    CREATE TABLE IF NOT EXISTS test_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenge_id INTEGER NOT NULL REFERENCES challenges(id),
      input_json TEXT NOT NULL,
      expected_output TEXT NOT NULL,
      ord INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      challenge_id INTEGER NOT NULL REFERENCES challenges(id),
      stars INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 0,
      hints_used INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'in_progress',
      completed_at INTEGER,
      UNIQUE(user_id, challenge_id)
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
  seedRoot(db)
}

function seedRoot(db: Database.Database): void {
  const exists = db.prepare("SELECT 1 FROM users WHERE username = 'root'").get()
  if (exists) return
  const now = Date.now()
  // Contraseña por defecto del root: 'changeme' (se cambiará en el hito de admin).
  const hash = createHash('sha256').update('changeme').digest('hex')
  db.prepare(
    `INSERT INTO users (username, display_name, avatar, profile_message, role, hidden, password_hash, created_at, last_seen)
     VALUES ('root', 'root', '', '', 'root', 1, ?, ?, ?)`,
  ).run(hash, now, now)
}
```

- [ ] **Step 4: Crear la conexión singleton**

Create `src/lib/db/connection.ts`:
```typescript
import Database from 'better-sqlite3'
import path from 'node:path'
import { createSchema } from './schema'

let instance: Database.Database | null = null

export function getDb(): Database.Database {
  if (instance) return instance
  const file = process.env.DB_PATH ?? path.join(process.cwd(), 'data.sqlite')
  instance = new Database(file)
  createSchema(instance)
  return instance
}
```

- [ ] **Step 5: Ejecutar el test para verificar que pasa**

Run: `npm test -- schema`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: esquema SQLite + siembra de root"
```

---

### Task 3: Repositorio de usuarios y validación de perfil

**Files:**
- Create: `src/lib/users/types.ts`, `src/lib/users/profile.ts`, `src/lib/users/repository.ts`
- Test: `src/lib/users/profile.test.ts`, `src/lib/users/repository.test.ts`

- [ ] **Step 1: Test de validación de perfil (falla)**

Create `src/lib/users/profile.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { validateProfileUpdate } from './profile'

describe('validateProfileUpdate', () => {
  it('acepta un mensaje de 100 caracteres', () => {
    const msg = 'a'.repeat(100)
    const r = validateProfileUpdate({ displayName: 'Ana', avatar: '', profileMessage: msg })
    expect(r.ok).toBe(true)
  })

  it('rechaza un mensaje de 101 caracteres', () => {
    const msg = 'a'.repeat(101)
    const r = validateProfileUpdate({ displayName: 'Ana', avatar: '', profileMessage: msg })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/100/)
  })

  it('rechaza un nombre vacío', () => {
    const r = validateProfileUpdate({ displayName: '   ', avatar: '', profileMessage: '' })
    expect(r.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar para verificar que falla**

Run: `npm test -- profile`
Expected: FAIL ("Cannot find module './profile'").

- [ ] **Step 3: Implementar tipos y validación**

Create `src/lib/users/types.ts`:
```typescript
export type Role = 'user' | 'admin' | 'root'

export interface User {
  id: number
  username: string
  displayName: string
  avatar: string
  profileMessage: string
  role: Role
  hidden: boolean
  createdAt: number
  lastSeen: number
}

export interface ProfileUpdate {
  displayName: string
  avatar: string
  profileMessage: string
}
```

Create `src/lib/users/profile.ts`:
```typescript
import type { ProfileUpdate } from './types'

export const MAX_PROFILE_MESSAGE = 100

export type ValidationResult = { ok: true } | { ok: false; error: string }

export function validateProfileUpdate(update: ProfileUpdate): ValidationResult {
  if (update.displayName.trim().length === 0) {
    return { ok: false, error: 'El nombre no puede estar vacío.' }
  }
  if (update.displayName.length > 40) {
    return { ok: false, error: 'El nombre no puede superar los 40 caracteres.' }
  }
  if (update.profileMessage.length > MAX_PROFILE_MESSAGE) {
    return { ok: false, error: `El mensaje no puede superar los ${MAX_PROFILE_MESSAGE} caracteres.` }
  }
  return { ok: true }
}
```

- [ ] **Step 4: Ejecutar el test de perfil (pasa)**

Run: `npm test -- profile`
Expected: PASS (3 tests).

- [ ] **Step 5: Test del repositorio (falla)**

Create `src/lib/users/repository.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../db/schema'
import { UserRepository } from './repository'

function freshRepo() {
  const db = new Database(':memory:')
  createSchema(db)
  return new UserRepository(db)
}

describe('UserRepository', () => {
  it('crea un usuario nuevo al hacer login por primera vez', () => {
    const repo = freshRepo()
    const user = repo.findOrCreateByUsername('ana')
    expect(user.username).toBe('ana')
    expect(user.role).toBe('user')
    expect(user.hidden).toBe(false)
    expect(user.displayName).toBe('ana')
  })

  it('devuelve el mismo usuario en logins posteriores', () => {
    const repo = freshRepo()
    const a = repo.findOrCreateByUsername('ana')
    const b = repo.findOrCreateByUsername('ana')
    expect(b.id).toBe(a.id)
  })

  it('actualiza el perfil', () => {
    const repo = freshRepo()
    const user = repo.findOrCreateByUsername('ana')
    repo.updateProfile(user.id, { displayName: 'Ana G.', avatar: 'cat', profileMessage: 'hola' })
    const updated = repo.findById(user.id)!
    expect(updated.displayName).toBe('Ana G.')
    expect(updated.avatar).toBe('cat')
    expect(updated.profileMessage).toBe('hola')
  })

  it('no permite registrarse con el username reservado root', () => {
    const repo = freshRepo()
    expect(() => repo.findOrCreateByUsername('root')).toThrow()
  })
})
```

- [ ] **Step 6: Ejecutar para verificar que falla**

Run: `npm test -- repository`
Expected: FAIL ("Cannot find module './repository'").

- [ ] **Step 7: Implementar el repositorio**

Create `src/lib/users/repository.ts`:
```typescript
import type Database from 'better-sqlite3'
import type { ProfileUpdate, Role, User } from './types'

interface UserRow {
  id: number
  username: string
  display_name: string
  avatar: string
  profile_message: string
  role: Role
  hidden: number
  created_at: number
  last_seen: number
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatar: row.avatar,
    profileMessage: row.profile_message,
    role: row.role,
    hidden: row.hidden === 1,
    createdAt: row.created_at,
    lastSeen: row.last_seen,
  }
}

export class UserRepository {
  constructor(private db: Database.Database) {}

  findById(id: number): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
    return row ? toUser(row) : null
  }

  findByUsername(username: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE username = ?').get(username) as
      | UserRow
      | undefined
    return row ? toUser(row) : null
  }

  findOrCreateByUsername(username: string): User {
    const clean = username.trim().toLowerCase()
    if (clean === 'root') {
      throw new Error('El nombre de usuario "root" está reservado.')
    }
    const existing = this.findByUsername(clean)
    const now = Date.now()
    if (existing) {
      this.db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').run(now, existing.id)
      return existing
    }
    const info = this.db
      .prepare(
        `INSERT INTO users (username, display_name, role, hidden, created_at, last_seen)
         VALUES (?, ?, 'user', 0, ?, ?)`,
      )
      .run(clean, clean, now, now)
    return this.findById(Number(info.lastInsertRowid))!
  }

  updateProfile(id: number, update: ProfileUpdate): void {
    this.db
      .prepare(
        'UPDATE users SET display_name = ?, avatar = ?, profile_message = ? WHERE id = ? AND role = (SELECT role FROM users WHERE id = ?)',
      )
      .run(update.displayName, update.avatar, update.profileMessage, id, id)
  }
}
```

- [ ] **Step 8: Ejecutar el test del repositorio (pasa)**

Run: `npm test -- repository`
Expected: PASS (4 tests).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: repositorio de usuarios + validación de perfil"
```

---

### Task 4: Cookie de sesión firmada (HMAC)

**Files:**
- Create: `src/lib/session/cookie.ts`
- Test: `src/lib/session/cookie.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Create `src/lib/session/cookie.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { signSession, verifySession } from './cookie'

const SECRET = 'test-secret-1234'

describe('cookie de sesión', () => {
  it('firma y verifica el id de usuario', () => {
    const token = signSession({ userId: 42 }, SECRET)
    const payload = verifySession(token, SECRET)
    expect(payload?.userId).toBe(42)
  })

  it('rechaza un token manipulado', () => {
    const token = signSession({ userId: 42 }, SECRET)
    const tampered = token.slice(0, -2) + (token.endsWith('a') ? 'bb' : 'aa')
    expect(verifySession(tampered, SECRET)).toBeNull()
  })

  it('rechaza un token firmado con otro secreto', () => {
    const token = signSession({ userId: 42 }, SECRET)
    expect(verifySession(token, 'otro-secreto')).toBeNull()
  })
})
```

- [ ] **Step 2: Ejecutar para verificar que falla**

Run: `npm test -- cookie`
Expected: FAIL ("Cannot find module './cookie'").

- [ ] **Step 3: Implementar firma/verificación**

Create `src/lib/session/cookie.ts`:
```typescript
import { createHmac, timingSafeEqual } from 'node:crypto'

export interface SessionPayload {
  userId: number
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

export function signSession(payload: SessionPayload, secret: string): string {
  const body = base64url(JSON.stringify(payload))
  const sig = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifySession(token: string, secret: string): SessionPayload | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts
  const expected = createHmac('sha256', secret).update(body).digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (typeof parsed?.userId !== 'number') return null
    return { userId: parsed.userId }
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Ejecutar el test (pasa)**

Run: `npm test -- cookie`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: cookie de sesión firmada con HMAC"
```

---

### Task 5: Helpers de sesión sobre cookies de Next.js

**Files:**
- Create: `src/lib/session/server.ts`
- Test: `src/lib/session/server.test.ts`

> Este módulo usa `next/headers` en producción, pero exponemos funciones puras que reciben/devuelven el valor de la cookie para poder testear sin servidor.

- [ ] **Step 1: Escribir el test que falla**

Create `src/lib/session/server.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../db/schema'
import { UserRepository } from '../users/repository'
import { resolveUserFromCookie } from './server'

const SECRET = 'test-secret-1234'

describe('resolveUserFromCookie', () => {
  it('devuelve null si no hay cookie', () => {
    const db = new Database(':memory:')
    createSchema(db)
    expect(resolveUserFromCookie(undefined, SECRET, new UserRepository(db))).toBeNull()
  })

  it('resuelve el usuario a partir de una cookie válida', () => {
    const db = new Database(':memory:')
    createSchema(db)
    const repo = new UserRepository(db)
    const user = repo.findOrCreateByUsername('ana')
    const { signSession } = require('./cookie')
    const token = signSession({ userId: user.id }, SECRET)
    const resolved = resolveUserFromCookie(token, SECRET, repo)
    expect(resolved?.username).toBe('ana')
  })
})
```

- [ ] **Step 2: Ejecutar para verificar que falla**

Run: `npm test -- session/server`
Expected: FAIL ("Cannot find module './server'").

- [ ] **Step 3: Implementar los helpers**

Create `src/lib/session/server.ts`:
```typescript
import { cookies } from 'next/headers'
import { signSession, verifySession } from './cookie'
import type { UserRepository } from '../users/repository'
import type { User } from '../users/types'

export const SESSION_COOKIE = 'fll_session'

function getSecret(): string {
  return process.env.SESSION_SECRET ?? 'dev-insecure-secret-change-me'
}

/** Función pura testeable: resuelve un usuario dado el valor de la cookie. */
export function resolveUserFromCookie(
  cookieValue: string | undefined,
  secret: string,
  repo: UserRepository,
): User | null {
  if (!cookieValue) return null
  const payload = verifySession(cookieValue, secret)
  if (!payload) return null
  return repo.findById(payload.userId)
}

/** Escribe la cookie de sesión (uso en route handlers / server actions). */
export async function setSessionCookie(userId: number): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, signSession({ userId }, getSecret()), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

/** Lee el usuario actual desde la cookie de la petición. */
export async function getCurrentUser(repo: UserRepository): Promise<User | null> {
  const store = await cookies()
  const value = store.get(SESSION_COOKIE)?.value
  return resolveUserFromCookie(value, getSecret(), repo)
}
```

- [ ] **Step 4: Ejecutar el test (pasa)**

Run: `npm test -- session/server`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: helpers de sesión sobre cookies de Next"
```

---

### Task 6: Motor JS (core puro) y formato de errores amable

**Files:**
- Create: `src/lib/engine/js-runner.ts`
- Test: `src/lib/engine/js-runner.test.ts`

> El core es síncrono y testeable en Node. El timeout (bucles infinitos) lo aporta el Web Worker en Task 7, no este core.

- [ ] **Step 1: Escribir el test que falla**

Create `src/lib/engine/js-runner.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { runJs, friendlyError } from './js-runner'

describe('runJs', () => {
  it('captura lo que el programa imprime', () => {
    const res = runJs('for (let i = 1; i <= 3; i++) print("Hola " + i)', {})
    expect(res.error).toBeUndefined()
    expect(res.output).toBe('Hola 1\nHola 2\nHola 3')
  })

  it('expone la entrada al programa como variable input', () => {
    const res = runJs('print(input.n * 2)', { n: 21 })
    expect(res.output).toBe('42')
  })

  it('devuelve un error amable ante un fallo de sintaxis', () => {
    const res = runJs('for (', {})
    expect(res.error).toBeTruthy()
    expect(res.output).toBe('')
  })
})

describe('friendlyError', () => {
  it('traduce un paréntesis sin cerrar a lenguaje claro', () => {
    const msg = friendlyError(new SyntaxError('Unexpected end of input'))
    expect(msg).toMatch(/falta/i)
  })
})
```

- [ ] **Step 2: Ejecutar para verificar que falla**

Run: `npm test -- js-runner`
Expected: FAIL ("Cannot find module './js-runner'").

- [ ] **Step 3: Implementar el runner**

Create `src/lib/engine/js-runner.ts`:
```typescript
export interface RunResult {
  output: string
  error?: string
  timeMs: number
}

export function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  if (/Unexpected end of input/i.test(raw)) {
    return 'Parece que falta cerrar algo (un paréntesis, una llave o una comilla).'
  }
  if (/is not defined/i.test(raw)) {
    const name = raw.match(/(\w+) is not defined/)?.[1]
    return `No reconozco "${name ?? 'algo'}". ¿Quizás está mal escrito o aún no lo has creado?`
  }
  if (/Unexpected token/i.test(raw)) {
    return 'Hay un símbolo donde no lo esperaba. Revisa la última línea que escribiste.'
  }
  return 'Tu programa tuvo un problema al ejecutarse. Revisa el código e inténtalo de nuevo.'
}

/**
 * Ejecuta código JS del alumno de forma síncrona, capturando lo impreso con print().
 * `input` se expone como variable global `input`. NO protege contra bucles infinitos
 * (eso lo hace el Web Worker con timeout).
 */
export function runJs(code: string, input: unknown): RunResult {
  const started = Date.now()
  const lines: string[] = []
  const print = (...args: unknown[]) => {
    lines.push(args.map((a) => String(a)).join(' '))
  }
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('input', 'print', `"use strict";\n${code}`)
    fn(input, print)
    return { output: lines.join('\n'), timeMs: Date.now() - started }
  } catch (err) {
    return { output: '', error: friendlyError(err), timeMs: Date.now() - started }
  }
}
```

- [ ] **Step 4: Ejecutar el test (pasa)**

Run: `npm test -- js-runner`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: motor JS (core) con captura de salida y errores amables"
```

---

### Task 7: Web Worker con timeout + cliente del motor

**Files:**
- Create: `src/lib/engine/worker.ts`, `src/lib/engine/client.ts`
- Test: (verificación manual en navegador — ver Step 4)

> Los Web Workers requieren entorno de navegador; esta tarea se verifica manualmente al integrar la página del reto (Task 12). El core ya está cubierto por tests en Task 6.

- [ ] **Step 1: Implementar el worker**

Create `src/lib/engine/worker.ts`:
```typescript
import { runJs } from './js-runner'

export interface WorkerRequest {
  code: string
  input: unknown
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { code, input } = e.data
  const result = runJs(code, input)
  // @ts-expect-error postMessage del contexto worker
  self.postMessage(result)
}
```

- [ ] **Step 2: Implementar el cliente con timeout**

Create `src/lib/engine/client.ts`:
```typescript
import type { RunResult } from './js-runner'

const TIMEOUT_MS = 3000

/** Ejecuta el código del alumno en un Worker aislado, abortando si tarda demasiado. */
export function runInWorker(code: string, input: unknown): Promise<RunResult> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url))
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

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: Web Worker con timeout + cliente del motor JS"
```

- [ ] **Step 4: Verificación manual (tras Task 12)**

Tras integrar la página del reto, abrir un reto, escribir `while(true){}` y comprobar que a los ~3 s aparece el mensaje de "tardó demasiado" sin colgar la pestaña.

---

### Task 8: Validación de salida (normalización + comparación)

**Files:**
- Create: `src/lib/grading/validate.ts`
- Test: `src/lib/grading/validate.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Create `src/lib/grading/validate.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { normalize, matchesExpected } from './validate'

describe('normalize', () => {
  it('recorta espacios al final de cada línea y del texto', () => {
    expect(normalize('Hola 1  \nHola 2\n\n')).toBe('Hola 1\nHola 2')
  })
})

describe('matchesExpected', () => {
  it('acepta salida correcta ignorando espacios finales', () => {
    expect(matchesExpected('5050  ', '5050')).toBe(true)
  })
  it('rechaza salida incorrecta', () => {
    expect(matchesExpected('5051', '5050')).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar para verificar que falla**

Run: `npm test -- grading/validate`
Expected: FAIL ("Cannot find module './validate'").

- [ ] **Step 3: Implementar la validación**

Create `src/lib/grading/validate.ts`:
```typescript
/** Normaliza la salida para comparar: recorta espacios finales por línea y bordes. */
export function normalize(output: string): string {
  return output
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/^\n+|\n+$/g, '')
}

export function matchesExpected(produced: string, expected: string): boolean {
  return normalize(produced) === normalize(expected)
}
```

- [ ] **Step 4: Ejecutar el test (pasa)**

Run: `npm test -- grading/validate`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: validación de salida con normalización"
```

---

### Task 9: Cálculo de estrellas

**Files:**
- Create: `src/lib/grading/stars.ts`
- Test: `src/lib/grading/stars.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Create `src/lib/grading/stars.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { computeStars } from './stars'

describe('computeStars', () => {
  it('da 0 estrellas si la salida es incorrecta', () => {
    expect(computeStars({ correct: false, attempts: 1, hintsUsed: 0 })).toBe(0)
  })
  it('da 3 estrellas a la primera sin pistas', () => {
    expect(computeStars({ correct: true, attempts: 1, hintsUsed: 0 })).toBe(3)
  })
  it('da 2 estrellas con varios intentos o alguna pista', () => {
    expect(computeStars({ correct: true, attempts: 3, hintsUsed: 0 })).toBe(2)
    expect(computeStars({ correct: true, attempts: 1, hintsUsed: 1 })).toBe(2)
  })
  it('da 1 estrella si costó mucho', () => {
    expect(computeStars({ correct: true, attempts: 8, hintsUsed: 3 })).toBe(1)
  })
})
```

- [ ] **Step 2: Ejecutar para verificar que falla**

Run: `npm test -- stars`
Expected: FAIL ("Cannot find module './stars'").

- [ ] **Step 3: Implementar el cálculo**

Create `src/lib/grading/stars.ts`:
```typescript
export interface StarInput {
  correct: boolean
  attempts: number
  hintsUsed: number
}

/** Umbrales por defecto (configurables por reto en hitos posteriores). */
export function computeStars({ correct, attempts, hintsUsed }: StarInput): number {
  if (!correct) return 0
  const penalty = attempts - 1 + hintsUsed
  if (penalty === 0) return 3
  if (penalty <= 3) return 2
  return 1
}
```

- [ ] **Step 4: Ejecutar el test (pasa)**

Run: `npm test -- stars`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: cálculo de estrellas (intentos + pistas)"
```

---

### Task 10: Currículo — tipos, repositorio y siembra lineal

**Files:**
- Create: `src/lib/curriculum/types.ts`, `src/lib/curriculum/repository.ts`, `src/lib/curriculum/seed.ts`
- Test: `src/lib/curriculum/repository.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Create `src/lib/curriculum/repository.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../db/schema'
import { seedCurriculum } from './seed'
import { CurriculumRepository } from './repository'

function seeded() {
  const db = new Database(':memory:')
  createSchema(db)
  seedCurriculum(db)
  return new CurriculumRepository(db)
}

describe('CurriculumRepository', () => {
  it('lista los retos en orden', () => {
    const repo = seeded()
    const list = repo.listChallenges()
    expect(list.length).toBeGreaterThanOrEqual(2)
    expect(list[0].ord).toBeLessThanOrEqual(list[1].ord)
  })

  it('devuelve un reto con su variante JS y casos de prueba (sin salida esperada en la variante)', () => {
    const repo = seeded()
    const slug = repo.listChallenges()[0].slug
    const full = repo.getChallengeBySlug(slug)!
    expect(full.variants.js).toBeTruthy()
    expect(full.testCases.length).toBeGreaterThanOrEqual(1)
    expect(full.testCases[0].expectedOutput).toBeTruthy()
  })

  it('devuelve null para un slug inexistente', () => {
    const repo = seeded()
    expect(repo.getChallengeBySlug('no-existe')).toBeNull()
  })
})
```

- [ ] **Step 2: Ejecutar para verificar que falla**

Run: `npm test -- curriculum/repository`
Expected: FAIL ("Cannot find module './repository'").

- [ ] **Step 3: Implementar tipos**

Create `src/lib/curriculum/types.ts`:
```typescript
export type Language = 'blocks' | 'js' | 'python'

export interface ChallengeSummary {
  id: number
  slug: string
  title: string
  ord: number
}

export interface ChallengeVariant {
  statement: string
  starterCode: string
  hints: string[]
}

export interface TestCase {
  input: unknown
  expectedOutput: string
}

export interface FullChallenge extends ChallengeSummary {
  narrative: string
  variants: Partial<Record<Language, ChallengeVariant>>
  testCases: TestCase[]
}
```

- [ ] **Step 4: Implementar el repositorio**

Create `src/lib/curriculum/repository.ts`:
```typescript
import type Database from 'better-sqlite3'
import type { ChallengeSummary, ChallengeVariant, FullChallenge, Language, TestCase } from './types'

export class CurriculumRepository {
  constructor(private db: Database.Database) {}

  listChallenges(): ChallengeSummary[] {
    return this.db
      .prepare('SELECT id, slug, title, ord FROM challenges ORDER BY ord ASC, id ASC')
      .all() as ChallengeSummary[]
  }

  getChallengeBySlug(slug: string): FullChallenge | null {
    const row = this.db
      .prepare('SELECT id, slug, title, ord, narrative FROM challenges WHERE slug = ?')
      .get(slug) as (ChallengeSummary & { narrative: string }) | undefined
    if (!row) return null

    const variantRows = this.db
      .prepare('SELECT language, statement, starter_code, hints_json FROM challenge_variants WHERE challenge_id = ?')
      .all(row.id) as { language: Language; statement: string; starter_code: string; hints_json: string }[]

    const variants: Partial<Record<Language, ChallengeVariant>> = {}
    for (const v of variantRows) {
      variants[v.language] = {
        statement: v.statement,
        starterCode: v.starter_code,
        hints: JSON.parse(v.hints_json),
      }
    }

    const testRows = this.db
      .prepare('SELECT input_json, expected_output FROM test_cases WHERE challenge_id = ? ORDER BY ord ASC, id ASC')
      .all(row.id) as { input_json: string; expected_output: string }[]
    const testCases: TestCase[] = testRows.map((t) => ({
      input: JSON.parse(t.input_json),
      expectedOutput: t.expected_output,
    }))

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      ord: row.ord,
      narrative: row.narrative,
      variants,
      testCases,
    }
  }
}
```

- [ ] **Step 5: Implementar la siembra del currículo lineal mínimo**

Create `src/lib/curriculum/seed.ts`:
```typescript
import type Database from 'better-sqlite3'

/** Siembra un currículo lineal mínimo (idempotente). Reto 1: print. Reto 2: bucles. */
export function seedCurriculum(db: Database.Database): void {
  const already = db.prepare('SELECT 1 FROM challenges LIMIT 1').get()
  if (already) return

  const concept = db
    .prepare("INSERT INTO concepts (slug, name, description, ord) VALUES ('fundamentos', 'Fundamentos', 'Primeros pasos', 0)")
    .run()
  const conceptId = Number(concept.lastInsertRowid)

  // Reto 1: imprimir un saludo.
  const c1 = db
    .prepare("INSERT INTO challenges (concept_id, slug, title, narrative, ord) VALUES (?, 'saludo', 'Tu primer saludo', 'Haz que el ordenador salude.', 0)")
    .run(conceptId)
  const c1Id = Number(c1.lastInsertRowid)
  db.prepare(
    `INSERT INTO challenge_variants (challenge_id, language, statement, starter_code, hints_json)
     VALUES (?, 'js', 'Imprime exactamente: Hola mundo', 'print("...")', ?)`,
  ).run(c1Id, JSON.stringify(['Usa print("Hola mundo")']))
  db.prepare("INSERT INTO test_cases (challenge_id, input_json, expected_output, ord) VALUES (?, 'null', 'Hola mundo', 0)").run(c1Id)

  // Reto 2: bucle del 1 al N (entrada FIJA grande para impedir trampa a mano).
  const c2 = db
    .prepare("INSERT INTO challenges (concept_id, slug, title, narrative, ord) VALUES (?, 'contar', 'Cuenta hasta el final', 'Saluda a cada número.', 1)")
    .run(conceptId)
  const c2Id = Number(c2.lastInsertRowid)
  db.prepare(
    `INSERT INTO challenge_variants (challenge_id, language, statement, starter_code, hints_json)
     VALUES (?, 'js', 'Imprime "Hola N" para cada N de 1 a input.hasta (incluido), uno por línea.', 'for (let i = 1; i <= input.hasta; i++) {\n  // tu código\n}', ?)`,
  ).run(c2Id, JSON.stringify(['Usa print dentro de un bucle for']))
  const hasta = 1000
  const expected = Array.from({ length: hasta }, (_, i) => `Hola ${i + 1}`).join('\n')
  db.prepare('INSERT INTO test_cases (challenge_id, input_json, expected_output, ord) VALUES (?, ?, ?, 0)').run(
    c2Id,
    JSON.stringify({ hasta }),
    expected,
  )
}
```

- [ ] **Step 6: Ejecutar el test (pasa)**

Run: `npm test -- curriculum/repository`
Expected: PASS (3 tests).

- [ ] **Step 7: Conectar la siembra del currículo al arranque de la BD**

Modify `src/lib/db/connection.ts` (añadir la llamada a `seedCurriculum` tras `createSchema`):
```typescript
import Database from 'better-sqlite3'
import path from 'node:path'
import { createSchema } from './schema'
import { seedCurriculum } from '../curriculum/seed'

let instance: Database.Database | null = null

export function getDb(): Database.Database {
  if (instance) return instance
  const file = process.env.DB_PATH ?? path.join(process.cwd(), 'data.sqlite')
  instance = new Database(file)
  createSchema(instance)
  seedCurriculum(instance)
  return instance
}
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: currículo (tipos, repositorio, siembra lineal mínima)"
```

---

### Task 11: Progreso y "siguiente lección" (lineal)

**Files:**
- Create: `src/lib/progress/repository.ts`, `src/lib/progress/next.ts`
- Test: `src/lib/progress/repository.test.ts`, `src/lib/progress/next.test.ts`

- [ ] **Step 1: Test del repositorio de progreso (falla)**

Create `src/lib/progress/repository.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../db/schema'
import { seedCurriculum } from '../curriculum/seed'
import { UserRepository } from '../users/repository'
import { ProgressRepository } from './repository'

function setup() {
  const db = new Database(':memory:')
  createSchema(db)
  seedCurriculum(db)
  const users = new UserRepository(db)
  const user = users.findOrCreateByUsername('ana')
  const challengeId = (db.prepare("SELECT id FROM challenges WHERE slug='saludo'").get() as any).id
  return { repo: new ProgressRepository(db), userId: user.id, challengeId }
}

describe('ProgressRepository', () => {
  it('registra un intento incrementando el contador', () => {
    const { repo, userId, challengeId } = setup()
    repo.recordAttempt(userId, challengeId, { stars: 0, hintsUsed: 0, completed: false })
    repo.recordAttempt(userId, challengeId, { stars: 3, hintsUsed: 0, completed: true })
    const p = repo.get(userId, challengeId)!
    expect(p.attempts).toBe(2)
    expect(p.stars).toBe(3)
    expect(p.status).toBe('completed')
  })

  it('no baja las estrellas ya conseguidas', () => {
    const { repo, userId, challengeId } = setup()
    repo.recordAttempt(userId, challengeId, { stars: 3, hintsUsed: 0, completed: true })
    repo.recordAttempt(userId, challengeId, { stars: 1, hintsUsed: 0, completed: true })
    expect(repo.get(userId, challengeId)!.stars).toBe(3)
  })

  it('lista los retos completados de un usuario', () => {
    const { repo, userId, challengeId } = setup()
    repo.recordAttempt(userId, challengeId, { stars: 2, hintsUsed: 0, completed: true })
    expect(repo.completedChallengeIds(userId)).toContain(challengeId)
  })
})
```

- [ ] **Step 2: Ejecutar para verificar que falla**

Run: `npm test -- progress/repository`
Expected: FAIL ("Cannot find module './repository'").

- [ ] **Step 3: Implementar el repositorio de progreso**

Create `src/lib/progress/repository.ts`:
```typescript
import type Database from 'better-sqlite3'

export interface ProgressRow {
  userId: number
  challengeId: number
  stars: number
  attempts: number
  hintsUsed: number
  status: 'in_progress' | 'completed'
  completedAt: number | null
}

export interface AttemptResult {
  stars: number
  hintsUsed: number
  completed: boolean
}

export class ProgressRepository {
  constructor(private db: Database.Database) {}

  get(userId: number, challengeId: number): ProgressRow | null {
    const row = this.db
      .prepare('SELECT * FROM progress WHERE user_id = ? AND challenge_id = ?')
      .get(userId, challengeId) as any
    if (!row) return null
    return {
      userId: row.user_id,
      challengeId: row.challenge_id,
      stars: row.stars,
      attempts: row.attempts,
      hintsUsed: row.hints_used,
      status: row.status,
      completedAt: row.completed_at,
    }
  }

  recordAttempt(userId: number, challengeId: number, result: AttemptResult): void {
    const existing = this.get(userId, challengeId)
    const now = Date.now()
    if (!existing) {
      this.db
        .prepare(
          `INSERT INTO progress (user_id, challenge_id, stars, attempts, hints_used, status, completed_at)
           VALUES (?, ?, ?, 1, ?, ?, ?)`,
        )
        .run(
          userId,
          challengeId,
          result.stars,
          result.hintsUsed,
          result.completed ? 'completed' : 'in_progress',
          result.completed ? now : null,
        )
      return
    }
    const newStars = Math.max(existing.stars, result.stars)
    const newStatus = existing.status === 'completed' || result.completed ? 'completed' : 'in_progress'
    const completedAt = existing.completedAt ?? (result.completed ? now : null)
    this.db
      .prepare(
        `UPDATE progress SET stars = ?, attempts = attempts + 1, hints_used = ?, status = ?, completed_at = ?
         WHERE user_id = ? AND challenge_id = ?`,
      )
      .run(newStars, result.hintsUsed, newStatus, completedAt, userId, challengeId)
  }

  completedChallengeIds(userId: number): number[] {
    const rows = this.db
      .prepare("SELECT challenge_id FROM progress WHERE user_id = ? AND status = 'completed'")
      .all(userId) as { challenge_id: number }[]
    return rows.map((r) => r.challenge_id)
  }
}
```

- [ ] **Step 4: Ejecutar el test (pasa)**

Run: `npm test -- progress/repository`
Expected: PASS (3 tests).

- [ ] **Step 5: Test de "siguiente lección" (falla)**

Create `src/lib/progress/next.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { nextChallengeSlug } from './next'
import type { ChallengeSummary } from '../curriculum/types'

const list: ChallengeSummary[] = [
  { id: 1, slug: 'a', title: 'A', ord: 0 },
  { id: 2, slug: 'b', title: 'B', ord: 1 },
  { id: 3, slug: 'c', title: 'C', ord: 2 },
]

describe('nextChallengeSlug', () => {
  it('sugiere el primero si no hay nada completado', () => {
    expect(nextChallengeSlug(list, [])).toBe('a')
  })
  it('sugiere el primero no completado en orden', () => {
    expect(nextChallengeSlug(list, [1])).toBe('b')
    expect(nextChallengeSlug(list, [1, 2])).toBe('c')
  })
  it('devuelve null si todo está completado', () => {
    expect(nextChallengeSlug(list, [1, 2, 3])).toBeNull()
  })
})
```

- [ ] **Step 6: Ejecutar para verificar que falla**

Run: `npm test -- progress/next`
Expected: FAIL ("Cannot find module './next'").

- [ ] **Step 7: Implementar "siguiente lección" lineal**

Create `src/lib/progress/next.ts`:
```typescript
import type { ChallengeSummary } from '../curriculum/types'

/** Lineal: el primer reto (por orden) que el usuario aún no ha completado. */
export function nextChallengeSlug(
  challenges: ChallengeSummary[],
  completedIds: number[],
): string | null {
  const done = new Set(completedIds)
  const ordered = [...challenges].sort((a, b) => a.ord - b.ord || a.id - b.id)
  const next = ordered.find((c) => !done.has(c.id))
  return next ? next.slug : null
}
```

- [ ] **Step 8: Ejecutar el test (pasa)**

Run: `npm test -- progress/next`
Expected: PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: progreso + siguiente lección (lineal)"
```

---

### Task 12: Rutas API (auth, perfil, reto, envío)

**Files:**
- Create: `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`, `src/app/api/me/route.ts`, `src/app/api/challenges/[slug]/route.ts`, `src/app/api/challenges/[slug]/submit/route.ts`
- Create: `src/lib/grading/grade.ts` (orquesta validación + estrellas; testeable)
- Test: `src/lib/grading/grade.test.ts`

> Las rutas son delgadas: parsean la petición, llaman a repos/funciones puras y serializan. La lógica de calificación se extrae a `grade.ts` para testearla sin servidor.

- [ ] **Step 1: Test de la orquestación de calificación (falla)**

Create `src/lib/grading/grade.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { gradeSubmission } from './grade'
import type { TestCase } from '../curriculum/types'

const cases: TestCase[] = [{ input: { hasta: 3 }, expectedOutput: 'Hola 1\nHola 2\nHola 3' }]

describe('gradeSubmission', () => {
  it('aprueba con la salida correcta y calcula estrellas', () => {
    const r = gradeSubmission({
      producedOutputs: ['Hola 1\nHola 2\nHola 3'],
      testCases: cases,
      attempts: 1,
      hintsUsed: 0,
    })
    expect(r.correct).toBe(true)
    expect(r.stars).toBe(3)
  })
  it('suspende si alguna salida no coincide', () => {
    const r = gradeSubmission({
      producedOutputs: ['Hola 1\nHola 2'],
      testCases: cases,
      attempts: 1,
      hintsUsed: 0,
    })
    expect(r.correct).toBe(false)
    expect(r.stars).toBe(0)
  })
})
```

- [ ] **Step 2: Ejecutar para verificar que falla**

Run: `npm test -- grading/grade`
Expected: FAIL ("Cannot find module './grade'").

- [ ] **Step 3: Implementar la orquestación**

Create `src/lib/grading/grade.ts`:
```typescript
import type { TestCase } from '../curriculum/types'
import { matchesExpected } from './validate'
import { computeStars } from './stars'

export interface GradeInput {
  producedOutputs: string[]
  testCases: TestCase[]
  attempts: number
  hintsUsed: number
}

export interface GradeResult {
  correct: boolean
  stars: number
}

export function gradeSubmission(input: GradeInput): GradeResult {
  const { producedOutputs, testCases, attempts, hintsUsed } = input
  const correct =
    producedOutputs.length === testCases.length &&
    testCases.every((tc, i) => matchesExpected(producedOutputs[i] ?? '', tc.expectedOutput))
  const stars = computeStars({ correct, attempts, hintsUsed })
  return { correct, stars }
}
```

- [ ] **Step 4: Ejecutar el test (pasa)**

Run: `npm test -- grading/grade`
Expected: PASS (2 tests).

- [ ] **Step 5: Implementar la ruta de login**

Create `src/app/api/auth/login/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { setSessionCookie } from '@/lib/session/server'

export async function POST(req: Request) {
  const { username } = await req.json()
  if (typeof username !== 'string' || username.trim().length === 0) {
    return NextResponse.json({ error: 'Escribe un nombre de usuario.' }, { status: 400 })
  }
  try {
    const repo = new UserRepository(getDb())
    const user = repo.findOrCreateByUsername(username)
    await setSessionCookie(user.id)
    return NextResponse.json({ ok: true, user: { username: user.username, displayName: user.displayName } })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
```

- [ ] **Step 6: Implementar logout**

Create `src/app/api/auth/logout/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/session/server'

export async function POST() {
  await clearSessionCookie()
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 7: Implementar /api/me (GET + PATCH)**

Create `src/app/api/me/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { getCurrentUser } from '@/lib/session/server'
import { validateProfileUpdate } from '@/lib/users/profile'

export async function GET() {
  const repo = new UserRepository(getDb())
  const user = await getCurrentUser(repo)
  if (!user) return NextResponse.json({ user: null }, { status: 401 })
  return NextResponse.json({ user })
}

export async function PATCH(req: Request) {
  const repo = new UserRepository(getDb())
  const user = await getCurrentUser(repo)
  if (!user) return NextResponse.json({ error: 'No has iniciado sesión.' }, { status: 401 })
  const body = await req.json()
  const update = {
    displayName: String(body.displayName ?? ''),
    avatar: String(body.avatar ?? ''),
    profileMessage: String(body.profileMessage ?? ''),
  }
  const v = validateProfileUpdate(update)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
  repo.updateProfile(user.id, update)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 8: Implementar la ruta del reto (entradas sin salida esperada)**

Create `src/app/api/challenges/[slug]/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { CurriculumRepository } from '@/lib/curriculum/repository'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const repo = new CurriculumRepository(getDb())
  const challenge = repo.getChallengeBySlug(slug)
  if (!challenge) return NextResponse.json({ error: 'Reto no encontrado.' }, { status: 404 })
  // Importante: NO enviamos expectedOutput al cliente.
  return NextResponse.json({
    slug: challenge.slug,
    title: challenge.title,
    narrative: challenge.narrative,
    variant: challenge.variants.js ?? null,
    inputs: challenge.testCases.map((tc) => tc.input),
  })
}
```

- [ ] **Step 9: Implementar la ruta de envío**

Create `src/app/api/challenges/[slug]/submit/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { CurriculumRepository } from '@/lib/curriculum/repository'
import { UserRepository } from '@/lib/users/repository'
import { ProgressRepository } from '@/lib/progress/repository'
import { getCurrentUser } from '@/lib/session/server'
import { gradeSubmission } from '@/lib/grading/grade'
import { nextChallengeSlug } from '@/lib/progress/next'

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const db = getDb()
  const users = new UserRepository(db)
  const user = await getCurrentUser(users)
  if (!user) return NextResponse.json({ error: 'No has iniciado sesión.' }, { status: 401 })

  const body = await req.json()
  const producedOutputs: string[] = Array.isArray(body.outputs) ? body.outputs.map(String) : []
  const hintsUsed = Number(body.hintsUsed ?? 0)

  const curriculum = new CurriculumRepository(db)
  const challenge = curriculum.getChallengeBySlug(slug)
  if (!challenge) return NextResponse.json({ error: 'Reto no encontrado.' }, { status: 404 })

  const progress = new ProgressRepository(db)
  const prev = progress.get(user.id, challenge.id)
  const attempts = (prev?.attempts ?? 0) + 1

  const { correct, stars } = gradeSubmission({
    producedOutputs,
    testCases: challenge.testCases,
    attempts,
    hintsUsed,
  })
  progress.recordAttempt(user.id, challenge.id, { stars, hintsUsed, completed: correct })

  const next = nextChallengeSlug(curriculum.listChallenges(), progress.completedChallengeIds(user.id))
  return NextResponse.json({ correct, stars, next })
}
```

- [ ] **Step 10: Ejecutar toda la batería de tests**

Run: `npm test`
Expected: PASS (todos los tests de las tasks 1–12).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: rutas API de auth, perfil, reto y envío + orquestación de calificación"
```

---

### Task 13: Páginas (login, currículo, reto, perfil)

**Files:**
- Create: `src/app/login/page.tsx`, `src/app/page.tsx` (reemplaza el de scaffold), `src/app/challenge/[slug]/page.tsx`, `src/app/profile/page.tsx`
- Modify: `src/app/layout.tsx` (título de la app)

> Estas páginas se verifican manualmente (Step 6). Mantienen estilos mínimos; la estética se aborda en un hito posterior.

- [ ] **Step 1: Pantalla de login**

Create `src/app/login/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'No se pudo entrar.')
      return
    }
    router.push('/')
  }

  return (
    <main style={{ maxWidth: 360, margin: '4rem auto', fontFamily: 'system-ui' }}>
      <h1>Entrar</h1>
      <form onSubmit={submit}>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Tu nombre de usuario"
          style={{ width: '100%', padding: 8, fontSize: 16 }}
        />
        <button type="submit" style={{ marginTop: 12, padding: '8px 16px' }}>
          Entrar
        </button>
      </form>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </main>
  )
}
```

- [ ] **Step 2: Página de currículo (server component)**

Create `src/app/page.tsx` (reemplaza el del scaffold):
```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { CurriculumRepository } from '@/lib/curriculum/repository'
import { ProgressRepository } from '@/lib/progress/repository'
import { getCurrentUser } from '@/lib/session/server'
import { nextChallengeSlug } from '@/lib/progress/next'

export default async function HomePage() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!user) redirect('/login')

  const curriculum = new CurriculumRepository(db)
  const progress = new ProgressRepository(db)
  const challenges = curriculum.listChallenges()
  const completed = new Set(progress.completedChallengeIds(user.id))
  const next = nextChallengeSlug(challenges, [...completed])

  return (
    <main style={{ maxWidth: 640, margin: '2rem auto', fontFamily: 'system-ui' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Hola, {user.displayName}</h1>
        <Link href="/profile">Mi perfil</Link>
      </header>
      {next && (
        <p>
          Siguiente lección: <Link href={`/challenge/${next}`}>empezar →</Link>
        </p>
      )}
      <ol>
        {challenges.map((c) => (
          <li key={c.id}>
            <Link href={`/challenge/${c.slug}`}>{c.title}</Link>{' '}
            {completed.has(c.id) ? '✓' : ''}
          </li>
        ))}
      </ol>
    </main>
  )
}
```

- [ ] **Step 3: Página del reto (editor + ejecutar + enviar)**

Create `src/app/challenge/[slug]/page.tsx`:
```tsx
'use client'
import { useEffect, useState, use } from 'react'
import { runInWorker } from '@/lib/engine/client'

interface ChallengeData {
  slug: string
  title: string
  narrative: string
  variant: { statement: string; starterCode: string; hints: string[] } | null
  inputs: unknown[]
}

export default function ChallengePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [data, setData] = useState<ChallengeData | null>(null)
  const [code, setCode] = useState('')
  const [consoleOut, setConsoleOut] = useState('')
  const [result, setResult] = useState<{ correct: boolean; stars: number } | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)

  useEffect(() => {
    fetch(`/api/challenges/${slug}`)
      .then((r) => r.json())
      .then((d: ChallengeData) => {
        setData(d)
        setCode(d.variant?.starterCode ?? '')
      })
  }, [slug])

  if (!data) return <main style={{ padding: 24 }}>Cargando…</main>
  if (!data.variant) return <main style={{ padding: 24 }}>Este reto no tiene versión en JavaScript todavía.</main>

  async function run() {
    // Ejecuta contra la primera entrada para que el alumno vea su salida.
    const res = await runInWorker(code, data.inputs[0])
    setConsoleOut(res.error ? res.error : res.output)
  }

  async function submit() {
    const outputs: string[] = []
    for (const input of data.inputs) {
      const res = await runInWorker(code, input)
      outputs.push(res.error ? '' : res.output)
    }
    const res = await fetch(`/api/challenges/${slug}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputs, hintsUsed }),
    })
    setResult(await res.json())
  }

  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', fontFamily: 'system-ui' }}>
      <h1>{data.title}</h1>
      <p>{data.narrative}</p>
      <p><strong>{data.variant.statement}</strong></p>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={10}
        style={{ width: '100%', fontFamily: 'monospace', fontSize: 14 }}
      />
      <div style={{ marginTop: 8 }}>
        <button onClick={run}>Ejecutar</button>{' '}
        <button onClick={submit}>Enviar</button>{' '}
        {data.variant.hints.length > 0 && (
          <button onClick={() => { setHintsUsed((n) => n + 1); alert(data.variant!.hints[0]) }}>
            Pista
          </button>
        )}
      </div>
      <pre style={{ background: '#111', color: '#0f0', padding: 12, minHeight: 60 }}>{consoleOut}</pre>
      {result && (
        <p>
          {result.correct ? `¡Correcto! ${'★'.repeat(result.stars)}` : 'Aún no es correcto, ¡prueba otra vez!'}
        </p>
      )}
    </main>
  )
}
```

- [ ] **Step 4: Página de perfil**

Create `src/app/profile/page.tsx`:
```tsx
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
```

- [ ] **Step 5: Ajustar el título de la app**

Modify `src/app/layout.tsx` — cambiar el objeto `metadata`:
```tsx
export const metadata = {
  title: 'Fab Lab León — Aprende a programar',
  description: 'Aprende programación con retos.',
}
```

- [ ] **Step 6: Verificación manual de extremo a extremo**

Run: `npm run dev`
Comprobar en `http://localhost:3000`:
1. Redirige a `/login`. Entra con un nombre nuevo → vuelve al currículo.
2. Abre el reto "Tu primer saludo", escribe `print("Hola mundo")`, **Ejecutar** muestra la salida, **Enviar** → "¡Correcto! ★★★".
3. Abre "Cuenta hasta el final", resuelve con un bucle `for` → correcto. Prueba a escribir las líneas a mano: inviable (1000 líneas) — confirma el anti-trampa.
4. Escribe `while(true){}` y **Ejecutar** → a los ~3 s aparece "tardó demasiado" sin colgar (verifica Task 7).
5. Ve a "Mi perfil", cambia el nombre y el mensaje; intenta pasar de 100 caracteres → el campo lo impide; guarda → "Guardado ✓".
6. Recarga la página: el progreso (✓) y el perfil persisten.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: páginas de login, currículo, reto y perfil"
```

---

## Self-Review (cobertura del spec — Hito A)

- Login por nombre de usuario + sesión + siembra de root → Tasks 2, 3, 4, 5, 12.
- Perfil (ver + editar nombre/avatar/mensaje ≤100) → Tasks 3, 12, 13.
- Currículo lineal mínimo en JS → Task 10.
- Un motor (JS) en el navegador con timeout → Tasks 6, 7.
- Validación por salida (entradas fijas) + el servidor nunca envía la salida esperada → Tasks 8, 10 (seed), 12 (ruta del reto sin expectedOutput).
- Estrellas → Task 9.
- Progreso + siguiente lección (lineal) → Task 11.
- Anti-trampa por entradas grandes (1→1000) → Task 10 (seed) + verificación manual Task 13.

Fuera de este hito (van en B–D, no son huecos): Bloques, Python, entradas aleatorias + solución de referencia, grafo con ramas por estrellas, apelaciones, panel admin.
