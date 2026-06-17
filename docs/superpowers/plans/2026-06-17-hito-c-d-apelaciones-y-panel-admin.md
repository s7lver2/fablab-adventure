# Hitos C + D — Apelaciones y Panel de Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) o superpowers:executing-plans para implementar task por task. Los Steps usan checkbox (`- [ ]`).
>
> **ADVERTENCIA DE PROCESO (lección de Hitos A/B):** el código y los tests de cada Step son el CONTRATO. Cópialos **literalmente**; no reescribas un test para que encaje con otra implementación. El revisor de spec compara el test implementado contra el del plan, no solo que "pase".
>
> **ADVERTENCIA DE FRAMEWORK (AGENTS.md):** este Next.js tiene cambios incompatibles con tu conocimiento previo. **Antes de escribir middleware, route handlers o server components nuevos, lee la guía relevante en `node_modules/next/dist/docs/`.** Especialmente para el **modo mantenimiento** (Task D3, middleware) y para cualquier API que difiera.

**Goal:** Completar el MVP del spec (§12). Sobre Hito A (bucle de aprendizaje) + Hito B (adaptatividad y 3 motores), añadir: **Apelaciones** (Parte C) y el **Panel de admin completo** (Parte D): login con contraseña, gestión de usuarios, modo mantenimiento, analítica con registro de eventos, edición de contenido y grafo, y la cola de revisión de apelaciones.

**Architecture:** Mismo proceso Next.js + SQLite local. El servidor **nunca ejecuta código del alumno** — el código apelado se guarda **solo para revisión humana**. La analítica se basa en una tabla `events` registrada desde el primer login. El admin se autentica con contraseña (hash); el alumno sigue entrando solo con nombre de usuario.

**Tech Stack:** Next.js 15, React 19, TypeScript, better-sqlite3, Vitest, `node:crypto` (hash), middleware de Next para mantenimiento.

**Prerrequisito:** Hito A + Hito B fusionados (o ejecutado sobre el branch `hito-b-adaptatividad-y-motores`). Este plan asume el esquema y repositorios de B ya presentes.

---

## Convenciones

- npm; comandos desde la raíz del repo.
- Tests Vitest en `*.test.ts` junto al código.
- Commits en español con prefijo convencional (`feat(c):`, `feat(d):`, `docs:`).
- **Reusar** repositorios y helpers existentes; no duplicar.
- Mensajes al usuario siempre amables y en español (spec §1, §9).

## Estado de partida relevante (tras Hito B)

```
src/lib/db/schema.ts            createSchema(db): users, concepts, challenges(+reference_solution,input_spec),
                                challenge_variants, test_cases, progress, settings, story_nodes, story_edges,
                                user_journey; seedRoot(db) (root oculto, hash sha256 de 'changeme');
                                helper addColumnIfMissing(db, tabla, col, ddl)
src/lib/db/connection.ts        getDb() → singleton; crea schema + seedCurriculum
src/lib/users/repository.ts     UserRepository: findById, findByUsername, findOrCreateByUsername (rechaza 'root'),
                                updateProfile.  ⚠️ toUser NO expone password_hash
src/lib/users/types.ts          Role='user'|'admin'|'root'; User{...}; ProfileUpdate
src/lib/session/server.ts       getCurrentUser(repo), setSessionCookie(userId), clearSessionCookie,
                                resolveUserFromCookie(...), SESSION_COOKIE='fll_session', getSecret()
src/lib/session/cookie.ts       signSession/verifySession (HMAC)
src/lib/progress/repository.ts  ProgressRepository: get(uid,cid), recordAttempt(uid,cid,{stars,hintsUsed,completed}),
                                completedChallengeIds(uid)
src/lib/curriculum/repository.ts CurriculumRepository: listChallenges()→{id,slug,title,ord}, getChallengeBySlug()
src/lib/story/repository.ts     StoryRepository: listNodes, listEdges, currentNode, setCurrentNode,
                                challengeSlugForNode, nodeForChallengeSlug
src/app/api/auth/login/route.ts POST {username} → findOrCreateByUsername + cookie
src/app/challenge/[slug]/page.tsx  reto (selector de lenguaje, ejecutar, enviar, resultado con estrellas)
src/app/page.tsx / profile / tree / login  páginas existentes
```

---
---

# PARTE C — Apelaciones (Hito C)

Spec §7: el alumno que cree que su solución es válida pulsa **"Creo que mi solución es válida"**, creando una **solicitud de revisión** con su código, la salida producida y un mensaje breve. Límites configurables: **1 pendiente por reto/alumno**, **máx. 3 pendientes globales/alumno**, **cooldown 24 h** para reapelar el mismo reto tras un rechazo. El código **se guarda solo para revisión humana y NUNCA se ejecuta en el servidor**. La cola de aceptar/rechazar vive en el panel de admin (Parte D).

---

### Task C1: Repositorio de settings (con límites de apelación)

**Files:**
- Create: `src/lib/settings/repository.ts`, `src/lib/settings/defaults.ts`
- Test: `src/lib/settings/repository.test.ts`

**Contexto:** La tabla `settings (key, value)` ya existe pero no hay acceso. Creamos un repositorio tipado con defaults. Centraliza límites de apelación (C) y, más tarde, el modo mantenimiento (D3).

- [ ] **Step 1: Test que falla**

Create `src/lib/settings/repository.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../db/schema'
import { SettingsRepository } from './repository'
import { DEFAULT_SETTINGS } from './defaults'

function repo() {
  const db = new Database(':memory:')
  createSchema(db)
  return new SettingsRepository(db)
}

describe('SettingsRepository', () => {
  it('devuelve el default cuando la clave no existe', () => {
    expect(repo().getNumber('appeals.maxPendingGlobal')).toBe(DEFAULT_SETTINGS['appeals.maxPendingGlobal'])
  })

  it('persiste y lee un número', () => {
    const r = repo()
    r.set('appeals.cooldownHours', '48')
    expect(r.getNumber('appeals.cooldownHours')).toBe(48)
  })

  it('lee booleanos', () => {
    const r = repo()
    expect(r.getBool('maintenance.enabled')).toBe(false)
    r.set('maintenance.enabled', 'true')
    expect(r.getBool('maintenance.enabled')).toBe(true)
  })

  it('all() incluye defaults mezclados con overrides', () => {
    const r = repo()
    r.set('appeals.maxPendingGlobal', '5')
    const all = r.all()
    expect(all['appeals.maxPendingGlobal']).toBe('5')
    expect(all['appeals.cooldownHours']).toBe(String(DEFAULT_SETTINGS['appeals.cooldownHours']))
  })
})
```

- [ ] **Step 2:** `npm test -- settings/repository` → FAIL.

- [ ] **Step 3: Defaults**

Create `src/lib/settings/defaults.ts`:
```typescript
/** Valores por defecto de settings (se sobreescriben en la tabla settings). */
export const DEFAULT_SETTINGS: Record<string, string> = {
  'appeals.maxPendingPerChallenge': '1',
  'appeals.maxPendingGlobal': '3',
  'appeals.cooldownHours': '24',
  'maintenance.enabled': 'false',
}
```

- [ ] **Step 4: Repositorio**

Create `src/lib/settings/repository.ts`:
```typescript
import type Database from 'better-sqlite3'
import { DEFAULT_SETTINGS } from './defaults'

export class SettingsRepository {
  constructor(private db: Database.Database) {}

  get(key: string): string {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined
    return row?.value ?? DEFAULT_SETTINGS[key] ?? ''
  }

  getNumber(key: string): number {
    return Number(this.get(key))
  }

  getBool(key: string): boolean {
    return this.get(key) === 'true'
  }

  set(key: string, value: string): void {
    this.db
      .prepare(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(key, value)
  }

  /** Defaults mezclados con overrides persistidos. */
  all(): Record<string, string> {
    const merged: Record<string, string> = { ...DEFAULT_SETTINGS }
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as {
      key: string
      value: string
    }[]
    for (const r of rows) merged[r.key] = r.value
    return merged
  }
}
```

- [ ] **Step 5:** `npm test -- settings/repository` → PASS (4). Luego `npm test` → PASS todos.

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "feat(c): repositorio de settings con defaults y límites de apelación"
```

---

### Task C2: Esquema de solicitudes de revisión

**Files:**
- Modify: `src/lib/db/schema.ts`
- Test: `src/lib/db/schema-c.test.ts`

- [ ] **Step 1: Test que falla**

Create `src/lib/db/schema-c.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from './schema'

describe('esquema Hito C', () => {
  it('crea la tabla review_requests con sus columnas', () => {
    const db = new Database(':memory:')
    createSchema(db)
    const cols = (db.prepare('PRAGMA table_info(review_requests)').all() as { name: string }[]).map(
      (c) => c.name,
    )
    expect(cols).toEqual(
      expect.arrayContaining([
        'id', 'user_id', 'challenge_id', 'language', 'submitted_code',
        'submitted_output', 'message', 'status', 'reviewer_admin_id',
        'feedback', 'created_at', 'resolved_at',
      ]),
    )
  })
})
```

- [ ] **Step 2:** `npm test -- schema-c` → FAIL.

- [ ] **Step 3: Añadir tabla**

En `src/lib/db/schema.ts`, dentro de `createSchema`, **antes** de `seedRoot(db)`, añade:
```typescript
  // --- Hito C: solicitudes de revisión (apelaciones) ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS review_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      challenge_id INTEGER NOT NULL REFERENCES challenges(id),
      language TEXT NOT NULL,
      submitted_code TEXT NOT NULL,
      submitted_output TEXT NOT NULL,
      message TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      reviewer_admin_id INTEGER REFERENCES users(id),
      feedback TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      resolved_at INTEGER
    );
  `)
```

- [ ] **Step 4:** `npm test -- schema-c` → PASS. Luego `npm test` → PASS todos.

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat(c): esquema de solicitudes de revisión"
```

---

### Task C3: Lógica de límites de apelación (pura)

**Files:**
- Create: `src/lib/appeals/limits.ts`
- Test: `src/lib/appeals/limits.test.ts`

**Contexto:** Función pura que decide si un alumno puede crear una apelación, dadas las cuentas actuales y los límites. Aísla las tres reglas del spec §7.

- [ ] **Step 1: Test que falla**

Create `src/lib/appeals/limits.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { canCreateAppeal } from './limits'

const limits = { maxPendingPerChallenge: 1, maxPendingGlobal: 3, cooldownHours: 24 }
const NOW = 1_000_000_000_000

describe('canCreateAppeal', () => {
  it('permite cuando no hay nada pendiente ni rechazos recientes', () => {
    const r = canCreateAppeal(
      { pendingForChallenge: 0, pendingGlobal: 0, lastRejectedAt: null },
      limits,
      NOW,
    )
    expect(r.allowed).toBe(true)
  })

  it('rechaza si ya hay una pendiente para ese reto', () => {
    const r = canCreateAppeal(
      { pendingForChallenge: 1, pendingGlobal: 1, lastRejectedAt: null },
      limits,
      NOW,
    )
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/pendiente/i)
  })

  it('rechaza si se alcanzó el máximo global de pendientes', () => {
    const r = canCreateAppeal(
      { pendingForChallenge: 0, pendingGlobal: 3, lastRejectedAt: null },
      limits,
      NOW,
    )
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/3/)
  })

  it('rechaza dentro del cooldown tras un rechazo', () => {
    const r = canCreateAppeal(
      { pendingForChallenge: 0, pendingGlobal: 0, lastRejectedAt: NOW - 1000 * 60 * 60 * 5 }, // hace 5 h
      limits,
      NOW,
    )
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/horas|esperar/i)
  })

  it('permite pasado el cooldown', () => {
    const r = canCreateAppeal(
      { pendingForChallenge: 0, pendingGlobal: 0, lastRejectedAt: NOW - 1000 * 60 * 60 * 25 }, // hace 25 h
      limits,
      NOW,
    )
    expect(r.allowed).toBe(true)
  })
})
```

- [ ] **Step 2:** `npm test -- appeals/limits` → FAIL.

- [ ] **Step 3: Implementar**

Create `src/lib/appeals/limits.ts`:
```typescript
export interface AppealCounts {
  pendingForChallenge: number
  pendingGlobal: number
  lastRejectedAt: number | null
}

export interface AppealLimits {
  maxPendingPerChallenge: number
  maxPendingGlobal: number
  cooldownHours: number
}

export interface AppealDecision {
  allowed: boolean
  reason?: string
}

/** Aplica las tres reglas del spec §7. Pura y testeable. */
export function canCreateAppeal(
  counts: AppealCounts,
  limits: AppealLimits,
  now: number,
): AppealDecision {
  if (counts.pendingForChallenge >= limits.maxPendingPerChallenge) {
    return { allowed: false, reason: 'Ya tienes una solicitud pendiente para este reto.' }
  }
  if (counts.pendingGlobal >= limits.maxPendingGlobal) {
    return {
      allowed: false,
      reason: `Solo puedes tener ${limits.maxPendingGlobal} solicitudes pendientes a la vez.`,
    }
  }
  if (counts.lastRejectedAt !== null) {
    const elapsedHours = (now - counts.lastRejectedAt) / (1000 * 60 * 60)
    if (elapsedHours < limits.cooldownHours) {
      const wait = Math.ceil(limits.cooldownHours - elapsedHours)
      return {
        allowed: false,
        reason: `Podrás volver a solicitar revisión de este reto en unas ${wait} horas.`,
      }
    }
  }
  return { allowed: true }
}
```

- [ ] **Step 4:** `npm test -- appeals/limits` → PASS (5). Luego `npm test` → PASS todos.

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat(c): lógica pura de límites de apelación"
```

---

### Task C4: Repositorio de apelaciones

**Files:**
- Create: `src/lib/appeals/repository.ts`, `src/lib/appeals/types.ts`
- Test: `src/lib/appeals/repository.test.ts`

**Contexto:** CRUD y conteos para apelaciones. **El código apelado se guarda sin ejecutarse.** La resolución (aceptar/rechazar) la añade la Parte D; aquí solo creación, conteos y listados.

- [ ] **Step 1: Test que falla**

Create `src/lib/appeals/repository.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../db/schema'
import { seedCurriculum } from '../curriculum/seed'
import { UserRepository } from '../users/repository'
import { AppealRepository } from './repository'

function setup() {
  const db = new Database(':memory:')
  createSchema(db)
  seedCurriculum(db)
  const user = new UserRepository(db).findOrCreateByUsername('ana')
  const challengeId = (db.prepare("SELECT id FROM challenges WHERE slug='saludo'").get() as { id: number }).id
  return { repo: new AppealRepository(db), userId: user.id, challengeId, db }
}

describe('AppealRepository', () => {
  it('crea una apelación y la lista por usuario', () => {
    const { repo, userId, challengeId } = setup()
    const id = repo.create({
      userId, challengeId, language: 'js',
      submittedCode: 'print("hola")', submittedOutput: 'hola', message: 'creo que vale',
    })
    expect(id).toBeGreaterThan(0)
    const mine = repo.listByUser(userId)
    expect(mine).toHaveLength(1)
    expect(mine[0].status).toBe('pending')
    expect(mine[0].submittedCode).toBe('print("hola")')
  })

  it('cuenta pendientes por reto y globales', () => {
    const { repo, userId, challengeId } = setup()
    repo.create({ userId, challengeId, language: 'js', submittedCode: 'x', submittedOutput: 'y', message: '' })
    expect(repo.countPendingForChallenge(userId, challengeId)).toBe(1)
    expect(repo.countPendingGlobal(userId)).toBe(1)
  })

  it('lastRejectedAt es null si no hay rechazos', () => {
    const { repo, userId, challengeId } = setup()
    expect(repo.lastRejectedAt(userId, challengeId)).toBeNull()
  })
})
```

- [ ] **Step 2:** `npm test -- appeals/repository` → FAIL.

- [ ] **Step 3: Tipos**

Create `src/lib/appeals/types.ts`:
```typescript
export type AppealStatus = 'pending' | 'accepted' | 'rejected'

export interface NewAppeal {
  userId: number
  challengeId: number
  language: string
  submittedCode: string
  submittedOutput: string
  message: string
}

export interface Appeal {
  id: number
  userId: number
  challengeId: number
  language: string
  submittedCode: string
  submittedOutput: string
  message: string
  status: AppealStatus
  reviewerAdminId: number | null
  feedback: string
  createdAt: number
  resolvedAt: number | null
}
```

- [ ] **Step 4: Repositorio**

Create `src/lib/appeals/repository.ts`:
```typescript
import type Database from 'better-sqlite3'
import type { Appeal, NewAppeal } from './types'

interface Row {
  id: number
  user_id: number
  challenge_id: number
  language: string
  submitted_code: string
  submitted_output: string
  message: string
  status: 'pending' | 'accepted' | 'rejected'
  reviewer_admin_id: number | null
  feedback: string
  created_at: number
  resolved_at: number | null
}

function toAppeal(r: Row): Appeal {
  return {
    id: r.id,
    userId: r.user_id,
    challengeId: r.challenge_id,
    language: r.language,
    submittedCode: r.submitted_code,
    submittedOutput: r.submitted_output,
    message: r.message,
    status: r.status,
    reviewerAdminId: r.reviewer_admin_id,
    feedback: r.feedback,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at,
  }
}

export class AppealRepository {
  constructor(private db: Database.Database) {}

  create(a: NewAppeal): number {
    const info = this.db
      .prepare(
        `INSERT INTO review_requests
           (user_id, challenge_id, language, submitted_code, submitted_output, message, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      )
      .run(a.userId, a.challengeId, a.language, a.submittedCode, a.submittedOutput, a.message, Date.now())
    return Number(info.lastInsertRowid)
  }

  getById(id: number): Appeal | null {
    const row = this.db.prepare('SELECT * FROM review_requests WHERE id = ?').get(id) as Row | undefined
    return row ? toAppeal(row) : null
  }

  listByUser(userId: number): Appeal[] {
    const rows = this.db
      .prepare('SELECT * FROM review_requests WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Row[]
    return rows.map(toAppeal)
  }

  listPending(): Appeal[] {
    const rows = this.db
      .prepare("SELECT * FROM review_requests WHERE status = 'pending' ORDER BY created_at ASC")
      .all() as Row[]
    return rows.map(toAppeal)
  }

  countPendingForChallenge(userId: number, challengeId: number): number {
    const row = this.db
      .prepare(
        "SELECT COUNT(*) AS n FROM review_requests WHERE user_id = ? AND challenge_id = ? AND status = 'pending'",
      )
      .get(userId, challengeId) as { n: number }
    return row.n
  }

  countPendingGlobal(userId: number): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS n FROM review_requests WHERE user_id = ? AND status = 'pending'")
      .get(userId) as { n: number }
    return row.n
  }

  lastRejectedAt(userId: number, challengeId: number): number | null {
    const row = this.db
      .prepare(
        "SELECT MAX(resolved_at) AS t FROM review_requests WHERE user_id = ? AND challenge_id = ? AND status = 'rejected'",
      )
      .get(userId, challengeId) as { t: number | null }
    return row.t ?? null
  }
}
```

- [ ] **Step 5:** `npm test -- appeals/repository` → PASS (3). Luego `npm test` → PASS todos.

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "feat(c): repositorio de apelaciones (creación, conteos, listados)"
```

---

### Task C5: API de creación de apelación + listado del alumno

**Files:**
- Create: `src/app/api/challenges/[slug]/appeal/route.ts`, `src/app/api/me/appeals/route.ts`
- Test: `src/lib/appeals/service.test.ts` + `src/lib/appeals/service.ts` (lógica de orquestación, testeable sin HTTP)

**Contexto:** Para mantener la lógica testeable, extraemos un **servicio** que, dado repos + entrada, decide y crea. Las rutas son finas.

- [ ] **Step 1: Test del servicio (falla)**

Create `src/lib/appeals/service.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../db/schema'
import { seedCurriculum } from '../curriculum/seed'
import { UserRepository } from '../users/repository'
import { AppealRepository } from './repository'
import { SettingsRepository } from '../settings/repository'
import { submitAppeal } from './service'

function setup() {
  const db = new Database(':memory:')
  createSchema(db)
  seedCurriculum(db)
  const user = new UserRepository(db).findOrCreateByUsername('ana')
  return {
    db,
    userId: user.id,
    appeals: new AppealRepository(db),
    settings: new SettingsRepository(db),
  }
}

describe('submitAppeal', () => {
  it('crea la primera apelación', () => {
    const { appeals, settings, userId } = setup()
    const res = submitAppeal(
      { appeals, settings },
      { userId, challengeId: 1, language: 'js', submittedCode: 'x', submittedOutput: 'y', message: 'vale' },
    )
    expect(res.ok).toBe(true)
    expect(appeals.listByUser(userId)).toHaveLength(1)
  })

  it('rechaza una segunda apelación pendiente para el mismo reto', () => {
    const { appeals, settings, userId } = setup()
    submitAppeal({ appeals, settings }, { userId, challengeId: 1, language: 'js', submittedCode: 'x', submittedOutput: 'y', message: '' })
    const res = submitAppeal({ appeals, settings }, { userId, challengeId: 1, language: 'js', submittedCode: 'x2', submittedOutput: 'y2', message: '' })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/pendiente/i)
    expect(appeals.listByUser(userId)).toHaveLength(1)
  })
})
```

- [ ] **Step 2:** `npm test -- appeals/service` → FAIL.

- [ ] **Step 3: Servicio**

Create `src/lib/appeals/service.ts`:
```typescript
import type { AppealRepository } from './repository'
import type { SettingsRepository } from '../settings/repository'
import type { NewAppeal } from './types'
import { canCreateAppeal } from './limits'

export interface AppealDeps {
  appeals: AppealRepository
  settings: SettingsRepository
}

export interface AppealResult {
  ok: boolean
  id?: number
  error?: string
}

/** Aplica límites y crea la apelación. El código NO se ejecuta — solo se guarda. */
export function submitAppeal(deps: AppealDeps, input: NewAppeal): AppealResult {
  const { appeals, settings } = deps
  const decision = canCreateAppeal(
    {
      pendingForChallenge: appeals.countPendingForChallenge(input.userId, input.challengeId),
      pendingGlobal: appeals.countPendingGlobal(input.userId),
      lastRejectedAt: appeals.lastRejectedAt(input.userId, input.challengeId),
    },
    {
      maxPendingPerChallenge: settings.getNumber('appeals.maxPendingPerChallenge'),
      maxPendingGlobal: settings.getNumber('appeals.maxPendingGlobal'),
      cooldownHours: settings.getNumber('appeals.cooldownHours'),
    },
    Date.now(),
  )
  if (!decision.allowed) return { ok: false, error: decision.reason }
  const id = appeals.create(input)
  return { ok: true, id }
}
```

- [ ] **Step 4:** `npm test -- appeals/service` → PASS (2).

- [ ] **Step 5: Ruta de creación**

Create `src/app/api/challenges/[slug]/appeal/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { CurriculumRepository } from '@/lib/curriculum/repository'
import { AppealRepository } from '@/lib/appeals/repository'
import { SettingsRepository } from '@/lib/settings/repository'
import { getCurrentUser } from '@/lib/session/server'
import { submitAppeal } from '@/lib/appeals/service'

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!user) return NextResponse.json({ error: 'No has iniciado sesión.' }, { status: 401 })

  const challenge = new CurriculumRepository(db).getChallengeBySlug(slug)
  if (!challenge) return NextResponse.json({ error: 'Reto no encontrado.' }, { status: 404 })

  const body = await req.json()
  const result = submitAppeal(
    { appeals: new AppealRepository(db), settings: new SettingsRepository(db) },
    {
      userId: user.id,
      challengeId: challenge.id,
      language: String(body.language ?? 'js'),
      submittedCode: String(body.code ?? ''),
      submittedOutput: String(body.output ?? ''),
      message: String(body.message ?? '').slice(0, 500),
    },
  )
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true, id: result.id })
}
```

- [ ] **Step 6: Ruta de listado del alumno**

Create `src/app/api/me/appeals/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { AppealRepository } from '@/lib/appeals/repository'
import { CurriculumRepository } from '@/lib/curriculum/repository'
import { getCurrentUser } from '@/lib/session/server'

export async function GET() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const appeals = new AppealRepository(db).listByUser(user.id)
  const curriculum = new CurriculumRepository(db)
  const titleById: Record<number, string> = {}
  for (const c of curriculum.listChallenges()) titleById[c.id] = c.title

  return NextResponse.json(
    appeals.map((a) => ({
      id: a.id,
      challengeTitle: titleById[a.challengeId] ?? '',
      status: a.status,
      feedback: a.feedback,
      createdAt: a.createdAt,
    })),
  )
}
```

- [ ] **Step 7:** `npm test` → PASS todos.

- [ ] **Step 8: Commit**
```bash
git add -A && git commit -m "feat(c): servicio y API de apelaciones (crear + listar las mías)"
```

---

### Task C6: UI del alumno — botón de apelación y estado en el perfil

**Files:**
- Modify: `src/app/challenge/[slug]/page.tsx` (botón tras resultado incorrecto)
- Modify: `src/app/profile/page.tsx` (o crear un componente cliente de apelaciones)
- Test: verificación manual

**Contexto:** Cuando el resultado es incorrecto, mostrar **"Creo que mi solución es válida"**. Al pulsar, pedir un mensaje breve y enviar el código + salida producida a la API. En el perfil, listar las apelaciones del alumno con su estado y feedback.

- [ ] **Step 1: Botón en la página del reto**

En `src/app/challenge/[slug]/page.tsx`, dentro del bloque `{result && (...)}`, cuando `result.correct === false`, añade un botón que cree la apelación. Añade un estado `appealMsg` y una función:
```tsx
  const [appealState, setAppealState] = useState<string | null>(null)

  async function appeal() {
    // La última ejecución del editor es lo que el alumno cree válido.
    const run = await runByLanguage(language, code, data!.inputs[0])
    const res = await fetch(`/api/challenges/${slug}/appeal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language,
        code,
        output: run.error ? '' : run.output,
        message: 'Creo que mi solución es válida.',
      }),
    })
    const json = await res.json()
    setAppealState(res.ok ? 'Enviada para revisión. ¡Gracias!' : json.error)
  }
```
Y en el JSX, dentro de `{result && (...)}` cuando no es correcto:
```tsx
      {result && !result.correct && (
        <div style={{ marginTop: 8 }}>
          <button onClick={appeal}>Creo que mi solución es válida</button>
          {appealState && <p>{appealState}</p>}
        </div>
      )}
```

> Nota didáctica (spec §1): el texto debe ser amable. No prometas que se aceptará; solo que se revisará.

- [ ] **Step 2: Estado en el perfil**

Crea un componente cliente `src/app/profile/MyAppeals.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'

interface AppealView {
  id: number
  challengeTitle: string
  status: 'pending' | 'accepted' | 'rejected'
  feedback: string
}

const LABEL: Record<AppealView['status'], string> = {
  pending: 'En revisión',
  accepted: 'Aceptada',
  rejected: 'No aceptada',
}

export function MyAppeals() {
  const [appeals, setAppeals] = useState<AppealView[] | null>(null)
  useEffect(() => {
    fetch('/api/me/appeals').then((r) => r.json()).then(setAppeals)
  }, [])
  if (!appeals) return null
  if (appeals.length === 0) return <p>No has pedido ninguna revisión.</p>
  return (
    <section>
      <h2>Mis solicitudes de revisión</h2>
      <ul>
        {appeals.map((a) => (
          <li key={a.id}>
            {a.challengeTitle}: <strong>{LABEL[a.status]}</strong>
            {a.feedback && <> — {a.feedback}</>}
          </li>
        ))}
      </ul>
    </section>
  )
}
```
E inclúyelo en `src/app/profile/page.tsx` (renderiza `<MyAppeals />`).

- [ ] **Step 3: Verificación manual**

`npm run dev`: resuelve un reto **mal** a propósito → aparece el botón → púlsalo → "Enviada para revisión". Pulsa otra vez → mensaje de límite (1 pendiente por reto). Ve al perfil → ves la solicitud "En revisión".

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "feat(c): UI del alumno para apelar y ver el estado de sus solicitudes"
```

---
---

# PARTE D — Panel de admin (Hito D)

Spec §8: backend con **contraseña** (solo `admin`/`root`), **gestión de usuarios** (crear admins solo por admins; `hidden` no asignable), **modo mantenimiento**, **analítica** con registro de eventos desde el primer login, **edición de contenido y grafo**, y **cola de revisión de apelaciones**.

> **Seguridad — login del alumno vs admin:** hoy `/api/auth/login` hace `findOrCreateByUsername`, que para un username existente de admin **iniciaría sesión sin contraseña**. La Task D1 cierra ese agujero: el login por nombre rechaza cuentas `admin`/`root`, que deben entrar por el login de admin con contraseña.

---

### Task D1: Autenticación de admin (contraseña)

**Files:**
- Create: `src/lib/auth/password.ts` (hash/verify), `src/lib/auth/password.test.ts`
- Modify: `src/lib/users/repository.ts` (verifyPassword, setPassword), `src/lib/users/repository.test.ts`
- Modify: `src/app/api/auth/login/route.ts` (rechazar admin/root)
- Create: `src/app/api/admin/login/route.ts`, `src/app/admin/login/page.tsx`

**Contexto:** Mantener el hash sha256 ya usado por `seedRoot` (coherencia local; encriptación fuerte para todos queda fuera del MVP, spec §12). Añadir verificación.

- [ ] **Step 1: Test de password (falla)**

Create `src/lib/auth/password.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('password', () => {
  it('verifica un hash correcto', () => {
    const h = hashPassword('secreta')
    expect(verifyPassword('secreta', h)).toBe(true)
  })
  it('rechaza una contraseña incorrecta', () => {
    const h = hashPassword('secreta')
    expect(verifyPassword('otra', h)).toBe(false)
  })
  it('coincide con el hash sembrado del root (sha256 de changeme)', () => {
    // seedRoot usa createHash('sha256').update('changeme').digest('hex')
    expect(verifyPassword('changeme', '057ba03d6c44104863dc7361fe4578965d1887360f90a0895882e58a6248fc86')).toBe(true)
  })
})
```

- [ ] **Step 2:** `npm test -- auth/password` → FAIL.

- [ ] **Step 3: Implementar password**

Create `src/lib/auth/password.ts`:
```typescript
import { createHash, timingSafeEqual } from 'node:crypto'

export function hashPassword(plain: string): string {
  return createHash('sha256').update(plain).digest('hex')
}

export function verifyPassword(plain: string, hash: string): boolean {
  const a = Buffer.from(hashPassword(plain))
  const b = Buffer.from(hash)
  return a.length === b.length && timingSafeEqual(a, b)
}
```

- [ ] **Step 4:** `npm test -- auth/password` → PASS (3).

- [ ] **Step 5: verifyPassword en UserRepository (test primero)**

Añade a `src/lib/users/repository.test.ts` un caso:
```typescript
  it('verifica la contraseña del root sembrado y permite cambiarla', () => {
    const db = new Database(':memory:')
    createSchema(db)
    const repo = new UserRepository(db)
    expect(repo.verifyPassword('root', 'changeme')).toBe(true)
    expect(repo.verifyPassword('root', 'mal')).toBe(false)
    repo.setPassword('root', 'nueva')
    expect(repo.verifyPassword('root', 'nueva')).toBe(true)
  })
```
(Asegúrate de que el fichero importa `Database` y `createSchema`; si no, añádelos.)

- [ ] **Step 6: Implementar en el repositorio**

En `src/lib/users/repository.ts` añade dos métodos a la clase y el import:
```typescript
import { hashPassword, verifyPassword as verifyHash } from '../auth/password'
```
```typescript
  verifyPassword(username: string, plain: string): boolean {
    const row = this.db
      .prepare('SELECT password_hash FROM users WHERE username = ?')
      .get(username.trim().toLowerCase()) as { password_hash: string | null } | undefined
    if (!row?.password_hash) return false
    return verifyHash(plain, row.password_hash)
  }

  setPassword(username: string, plain: string): void {
    this.db
      .prepare('UPDATE users SET password_hash = ? WHERE username = ?')
      .run(hashPassword(plain), username.trim().toLowerCase())
  }
```

- [ ] **Step 7:** `npm test -- users/repository` → PASS.

- [ ] **Step 8: Cerrar el login de alumno para admins**

En `src/app/api/auth/login/route.ts`, **antes** de `findOrCreateByUsername`, añade:
```typescript
    const existing = repo.findByUsername(username.trim().toLowerCase())
    if (existing && existing.role !== 'user') {
      return NextResponse.json(
        { error: 'Esta cuenta es de administración. Entra por el acceso de admin.' },
        { status: 403 },
      )
    }
```

- [ ] **Step 9: Ruta de login de admin**

Create `src/app/api/admin/login/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { setSessionCookie } from '@/lib/session/server'

export async function POST(req: Request) {
  const { username, password } = await req.json()
  const repo = new UserRepository(getDb())
  const user = repo.findByUsername(String(username ?? ''))
  if (!user || (user.role !== 'admin' && user.role !== 'root')) {
    return NextResponse.json({ error: 'Credenciales no válidas.' }, { status: 401 })
  }
  if (!repo.verifyPassword(user.username, String(password ?? ''))) {
    return NextResponse.json({ error: 'Credenciales no válidas.' }, { status: 401 })
  }
  await setSessionCookie(user.id)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 10: Página de login de admin**

Create `src/app/admin/login/page.tsx`: formulario cliente con `username` + `password` que hace POST a `/api/admin/login` y, si `ok`, redirige a `/admin`. (Estilo simple, reutiliza inputs/botón globales.)

- [ ] **Step 11:** `npm test` → PASS todos.

- [ ] **Step 12: Commit**
```bash
git add -A && git commit -m "feat(d): autenticación de admin con contraseña y cierre del login de alumno para cuentas admin"
```

---

### Task D2: Guard de admin y layout del panel

**Files:**
- Create: `src/lib/auth/guard.ts`, `src/lib/auth/guard.test.ts`
- Create: `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`

**Contexto:** Helper que exige rol admin/root, reutilizable por páginas y rutas del panel.

- [ ] **Step 1: Test del guard (puro, falla)**

Create `src/lib/auth/guard.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { isAdmin } from './guard'

describe('isAdmin', () => {
  it('acepta admin y root', () => {
    expect(isAdmin({ role: 'admin' })).toBe(true)
    expect(isAdmin({ role: 'root' })).toBe(true)
  })
  it('rechaza user y null', () => {
    expect(isAdmin({ role: 'user' })).toBe(false)
    expect(isAdmin(null)).toBe(false)
  })
})
```

- [ ] **Step 2:** `npm test -- auth/guard` → FAIL.

- [ ] **Step 3: Implementar**

Create `src/lib/auth/guard.ts`:
```typescript
import type { Role } from '../users/types'

export function isAdmin(user: { role: Role } | null): boolean {
  return user !== null && (user.role === 'admin' || user.role === 'root')
}
```

- [ ] **Step 4:** `npm test -- auth/guard` → PASS (2).

- [ ] **Step 5: Layout del panel**

Create `src/app/admin/layout.tsx` (server component) que obtiene el usuario y, si `!isAdmin`, `redirect('/admin/login')`. Renderiza una navegación con enlaces a: Resumen (`/admin`), Usuarios (`/admin/users`), Apelaciones (`/admin/appeals`), Contenido (`/admin/content`), Analítica (`/admin/analytics`), Ajustes (`/admin/settings`).
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

- [ ] **Step 6: Página de resumen**

Create `src/app/admin/page.tsx`: server component que muestra conteos rápidos (nº usuarios, apelaciones pendientes, retos). Usa repos existentes.

- [ ] **Step 7:** `npm test` → PASS. Verificación manual: `/admin` sin sesión admin → redirige a `/admin/login`.

- [ ] **Step 8: Commit**
```bash
git add -A && git commit -m "feat(d): guard de admin y layout del panel"
```

---

### Task D3: Modo mantenimiento

**Files:**
- Create: `src/middleware.ts` (o el mecanismo que indique la guía de esta versión de Next)
- Create: `src/app/maintenance/page.tsx`
- Test: `src/lib/settings/maintenance.test.ts` + `src/lib/settings/maintenance.ts` (decisión pura)

**Contexto:** Cuando `maintenance.enabled=true`, todos ven la página de mantenimiento salvo admins y las rutas de admin/login. **LEE PRIMERO** `node_modules/next/dist/docs/` sobre middleware: la API puede diferir de tu conocimiento.

- [ ] **Step 1: Decisión pura (test falla)**

Create `src/lib/settings/maintenance.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { shouldBlockForMaintenance } from './maintenance'

describe('shouldBlockForMaintenance', () => {
  it('no bloquea si mantenimiento está apagado', () => {
    expect(shouldBlockForMaintenance({ enabled: false, isAdmin: false, path: '/' })).toBe(false)
  })
  it('bloquea a usuarios normales cuando está encendido', () => {
    expect(shouldBlockForMaintenance({ enabled: true, isAdmin: false, path: '/' })).toBe(true)
  })
  it('nunca bloquea a admins', () => {
    expect(shouldBlockForMaintenance({ enabled: true, isAdmin: true, path: '/' })).toBe(false)
  })
  it('nunca bloquea rutas de admin ni la propia página de mantenimiento', () => {
    expect(shouldBlockForMaintenance({ enabled: true, isAdmin: false, path: '/admin/login' })).toBe(false)
    expect(shouldBlockForMaintenance({ enabled: true, isAdmin: false, path: '/maintenance' })).toBe(false)
  })
})
```

- [ ] **Step 2:** `npm test -- settings/maintenance` → FAIL.

- [ ] **Step 3: Implementar decisión**

Create `src/lib/settings/maintenance.ts`:
```typescript
export function shouldBlockForMaintenance(args: {
  enabled: boolean
  isAdmin: boolean
  path: string
}): boolean {
  if (!args.enabled || args.isAdmin) return false
  if (args.path.startsWith('/admin') || args.path === '/maintenance') return false
  return true
}
```

- [ ] **Step 4:** `npm test -- settings/maintenance` → PASS (4).

- [ ] **Step 5: Página de mantenimiento**

Create `src/app/maintenance/page.tsx`: mensaje amable ("Estamos haciendo mejoras, ¡vuelve pronto!").

- [ ] **Step 6: Aplicar en middleware**

Tras leer la guía de middleware de esta versión de Next, crea el gate que, leyendo `maintenance.enabled` y el rol del usuario, redirige a `/maintenance` según `shouldBlockForMaintenance`.

> Si el middleware de esta versión no puede acceder a SQLite (entorno edge), implementa el gate en un **layout raíz server component** en su lugar (lee la guía y elige el mecanismo soportado). La decisión pura (`shouldBlockForMaintenance`) se reutiliza igual.

- [ ] **Step 7:** `npm test` → PASS. Manual: enciende `maintenance.enabled` (vía Ajustes en D8 o `settings` directo) → alumno ve `/maintenance`, admin sigue navegando.

- [ ] **Step 8: Commit**
```bash
git add -A && git commit -m "feat(d): modo mantenimiento (decisión pura + gate)"
```

---

### Task D4: Gestión de usuarios y reglas de roles

**Files:**
- Create: `src/lib/users/admin-rules.ts`, `src/lib/users/admin-rules.test.ts`
- Modify: `src/lib/users/repository.ts` (listAll, createAdmin, setRole)
- Create: `src/app/api/admin/users/route.ts`, `src/app/admin/users/page.tsx`

**Contexto:** Reglas del spec §5: solo admin/root crean admins; **`hidden` no es asignable**; no se puede tocar a `root`; no auto-degradarse el único admin (precaución mínima).

- [ ] **Step 1: Reglas puras (test falla)**

Create `src/lib/users/admin-rules.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { canCreateAdmin, canChangeRole } from './admin-rules'

describe('reglas de roles', () => {
  it('solo admin/root pueden crear admins', () => {
    expect(canCreateAdmin('admin').allowed).toBe(true)
    expect(canCreateAdmin('root').allowed).toBe(true)
    expect(canCreateAdmin('user').allowed).toBe(false)
  })

  it('no se puede cambiar el rol de un root', () => {
    expect(canChangeRole({ actorRole: 'root', targetRole: 'root', newRole: 'admin' }).allowed).toBe(false)
  })

  it('no se puede promover a root (hidden/root no asignables por UI)', () => {
    expect(canChangeRole({ actorRole: 'root', targetRole: 'user', newRole: 'root' }).allowed).toBe(false)
  })

  it('un admin puede promover user→admin y degradar admin→user', () => {
    expect(canChangeRole({ actorRole: 'admin', targetRole: 'user', newRole: 'admin' }).allowed).toBe(true)
    expect(canChangeRole({ actorRole: 'admin', targetRole: 'admin', newRole: 'user' }).allowed).toBe(true)
  })

  it('un user no puede cambiar roles', () => {
    expect(canChangeRole({ actorRole: 'user', targetRole: 'user', newRole: 'admin' }).allowed).toBe(false)
  })
})
```

- [ ] **Step 2:** `npm test -- admin-rules` → FAIL.

- [ ] **Step 3: Implementar reglas**

Create `src/lib/users/admin-rules.ts`:
```typescript
import type { Role } from './types'

interface Decision { allowed: boolean; reason?: string }

export function canCreateAdmin(actorRole: Role): Decision {
  if (actorRole === 'admin' || actorRole === 'root') return { allowed: true }
  return { allowed: false, reason: 'Solo un administrador puede crear administradores.' }
}

export function canChangeRole(args: { actorRole: Role; targetRole: Role; newRole: Role }): Decision {
  if (args.actorRole !== 'admin' && args.actorRole !== 'root') {
    return { allowed: false, reason: 'No tienes permiso para cambiar roles.' }
  }
  if (args.targetRole === 'root') return { allowed: false, reason: 'No se puede modificar a root.' }
  if (args.newRole === 'root') return { allowed: false, reason: 'No se puede asignar el rol root.' }
  if (args.newRole !== 'user' && args.newRole !== 'admin') {
    return { allowed: false, reason: 'Rol no válido.' }
  }
  return { allowed: true }
}
```

- [ ] **Step 4:** `npm test -- admin-rules` → PASS (5).

- [ ] **Step 5: Métodos del repositorio**

En `src/lib/users/repository.ts` añade:
```typescript
  listAll(includeHidden = false): User[] {
    const rows = this.db
      .prepare(`SELECT * FROM users ${includeHidden ? '' : 'WHERE hidden = 0'} ORDER BY created_at`)
      .all() as UserRow[]
    return rows.map(toUser)
  }

  createAdmin(username: string, displayName: string, password: string): User {
    const clean = username.trim().toLowerCase()
    const now = Date.now()
    const info = this.db
      .prepare(
        `INSERT INTO users (username, display_name, role, hidden, password_hash, created_at, last_seen)
         VALUES (?, ?, 'admin', 0, ?, ?, ?)`,
      )
      .run(clean, displayName || clean, hashPassword(password), now, now)
    return this.findById(Number(info.lastInsertRowid))!
  }

  setRole(userId: number, role: Role): void {
    this.db.prepare("UPDATE users SET role = ? WHERE id = ? AND role != 'root'").run(role, userId)
  }
```
(El import de `hashPassword` ya se añadió en D1. Nunca se expone ni asigna `hidden` desde aquí.)

- [ ] **Step 6: API de usuarios (admin)**

Create `src/app/api/admin/users/route.ts`: `GET` lista usuarios (no ocultos); `POST` crea admin (valida con `canCreateAdmin(actor.role)`); `PATCH` cambia rol (valida con `canChangeRole`). Todas exigen `isAdmin(actor)`.

- [ ] **Step 7: Página de usuarios**

Create `src/app/admin/users/page.tsx`: tabla de usuarios + formulario "crear admin" + botones promover/degradar. Llama a la API.

- [ ] **Step 8:** `npm test` → PASS. Manual: crear un admin, promover/degradar, comprobar que root no es editable y que `hidden` nunca aparece como opción.

- [ ] **Step 9: Commit**
```bash
git add -A && git commit -m "feat(d): gestión de usuarios y reglas de roles"
```

---

### Task D5: Registro de eventos (cimiento de analítica)

**Files:**
- Modify: `src/lib/db/schema.ts` (tabla `events`)
- Create: `src/lib/analytics/events.ts` (logEvent + sesión), `src/lib/analytics/events.test.ts`
- Modify: rutas clave para registrar eventos: `auth/login`, `challenges/[slug]` (GET = abrir reto), `challenges/[slug]/submit`

**Contexto:** El spec pide eventos "desde el día uno" para la analítica; los retrofiteamos ahora. Cada evento: tipo, user_id, ruta, session_id, user_agent, referrer, meta, timestamp. La sesión de analítica es una cookie aparte de la de auth.

- [ ] **Step 1: Esquema de events (incluir en schema-c o nuevo test)**

En `src/lib/db/schema.ts`, antes de `seedRoot`, añade:
```typescript
  // --- Hito D: eventos para analítica ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      user_id INTEGER,
      path TEXT NOT NULL DEFAULT '',
      session_id TEXT NOT NULL DEFAULT '',
      user_agent TEXT NOT NULL DEFAULT '',
      referrer TEXT NOT NULL DEFAULT '',
      meta_json TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
  `)
```

- [ ] **Step 2: Test del logger (falla)**

Create `src/lib/analytics/events.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../db/schema'
import { EventLogger } from './events'

function setup() {
  const db = new Database(':memory:')
  createSchema(db)
  return { db, logger: new EventLogger(db) }
}

describe('EventLogger', () => {
  it('registra un evento y lo puede listar', () => {
    const { db, logger } = setup()
    logger.log({ type: 'login', userId: 1, path: '/login', sessionId: 's1', userAgent: 'UA', referrer: '', meta: { ok: true } })
    const rows = db.prepare('SELECT * FROM events').all() as { type: string; session_id: string; meta_json: string }[]
    expect(rows).toHaveLength(1)
    expect(rows[0].type).toBe('login')
    expect(rows[0].session_id).toBe('s1')
    expect(JSON.parse(rows[0].meta_json).ok).toBe(true)
  })

  it('listAll devuelve eventos normalizados', () => {
    const { logger } = setup()
    logger.log({ type: 'open_challenge', userId: 2, path: '/challenge/saludo', sessionId: 's2', userAgent: '', referrer: '', meta: {} })
    const all = logger.listAll()
    expect(all[0].type).toBe('open_challenge')
    expect(all[0].userId).toBe(2)
  })
})
```

- [ ] **Step 3:** `npm test -- analytics/events` → FAIL.

- [ ] **Step 4: Implementar EventLogger**

Create `src/lib/analytics/events.ts`:
```typescript
import type Database from 'better-sqlite3'

export interface EventInput {
  type: string
  userId?: number | null
  path?: string
  sessionId?: string
  userAgent?: string
  referrer?: string
  meta?: Record<string, unknown>
}

export interface EventRecord {
  id: number
  type: string
  userId: number | null
  path: string
  sessionId: string
  userAgent: string
  referrer: string
  meta: Record<string, unknown>
  createdAt: number
}

export class EventLogger {
  constructor(private db: Database.Database) {}

  log(e: EventInput): void {
    this.db
      .prepare(
        `INSERT INTO events (type, user_id, path, session_id, user_agent, referrer, meta_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        e.type,
        e.userId ?? null,
        e.path ?? '',
        e.sessionId ?? '',
        e.userAgent ?? '',
        e.referrer ?? '',
        JSON.stringify(e.meta ?? {}),
        Date.now(),
      )
  }

  listAll(): EventRecord[] {
    const rows = this.db.prepare('SELECT * FROM events ORDER BY created_at').all() as {
      id: number; type: string; user_id: number | null; path: string; session_id: string
      user_agent: string; referrer: string; meta_json: string; created_at: number
    }[]
    return rows.map((r) => ({
      id: r.id, type: r.type, userId: r.user_id, path: r.path, sessionId: r.session_id,
      userAgent: r.user_agent, referrer: r.referrer, meta: JSON.parse(r.meta_json), createdAt: r.created_at,
    }))
  }
}
```

- [ ] **Step 5:** `npm test -- analytics/events` → PASS (2).

- [ ] **Step 6: Instrumentar rutas**

Crea un helper `src/lib/analytics/record.ts` que extrae `session_id` (cookie `fll_aid`, créala si falta), `user-agent` y `referer` de la `Request` y llama a `EventLogger.log`. Llámalo en:
- `auth/login` (type `login`)
- `challenges/[slug]` GET (type `open_challenge`, meta `{slug}`)
- `challenges/[slug]/submit` POST (type `submit`, meta `{slug, correct, stars}`)

Mantén el registro **best-effort**: envuelto en try/catch para que un fallo de analítica nunca rompa el flujo del alumno.

- [ ] **Step 7:** `npm test` → PASS. Manual: navega y comprueba filas en `events` (`sqlite3 data.sqlite "SELECT type,count(*) FROM events GROUP BY type"`).

- [ ] **Step 8: Commit**
```bash
git add -A && git commit -m "feat(d): registro de eventos para analítica (esquema + logger + instrumentación)"
```

---

### Task D6: Agregación de analítica (puro) + página

**Files:**
- Create: `src/lib/analytics/aggregate.ts`, `src/lib/analytics/aggregate.test.ts`
- Create: `src/lib/analytics/user-agent.ts`, `src/lib/analytics/user-agent.test.ts`
- Create: `src/app/api/admin/analytics/route.ts`, `src/app/admin/analytics/page.tsx`

**Contexto:** Funciones puras sobre el array de eventos. Métricas realistas para una red local: sesiones, eventos, usuarios activos, duración media de sesión, rebote (sesiones de 1 evento), actividad por hora, dispositivos/navegadores (parseados del user-agent). "Dónde se atascan" se calcula sobre progreso/journey (Task D6b dentro de esta tarea).

- [ ] **Step 1: Parser de user-agent (test falla)**

Create `src/lib/analytics/user-agent.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { parseUserAgent } from './user-agent'

describe('parseUserAgent', () => {
  it('detecta Chrome en Windows escritorio', () => {
    const r = parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537')
    expect(r.browser).toBe('Chrome')
    expect(r.os).toBe('Windows')
    expect(r.device).toBe('Escritorio')
  })
  it('detecta móvil Android', () => {
    const r = parseUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel) Chrome/120 Mobile Safari/537')
    expect(r.os).toBe('Android')
    expect(r.device).toBe('Móvil')
  })
  it('desconocido si está vacío', () => {
    const r = parseUserAgent('')
    expect(r.browser).toBe('Desconocido')
  })
})
```

- [ ] **Step 2:** `npm test -- analytics/user-agent` → FAIL.

- [ ] **Step 3: Implementar parser**

Create `src/lib/analytics/user-agent.ts`:
```typescript
export interface UAInfo { browser: string; os: string; device: string }

export function parseUserAgent(ua: string): UAInfo {
  if (!ua) return { browser: 'Desconocido', os: 'Desconocido', device: 'Desconocido' }
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua)
  const os = /Android/i.test(ua) ? 'Android'
    : /iPhone|iPad|iOS/i.test(ua) ? 'iOS'
    : /Windows/i.test(ua) ? 'Windows'
    : /Mac OS X|Macintosh/i.test(ua) ? 'macOS'
    : /Linux/i.test(ua) ? 'Linux'
    : 'Desconocido'
  const browser = /Edg\//i.test(ua) ? 'Edge'
    : /Chrome\//i.test(ua) ? 'Chrome'
    : /Firefox\//i.test(ua) ? 'Firefox'
    : /Safari\//i.test(ua) ? 'Safari'
    : 'Desconocido'
  return { browser, os, device: isMobile ? 'Móvil' : 'Escritorio' }
}
```

- [ ] **Step 4:** `npm test -- analytics/user-agent` → PASS (3).

- [ ] **Step 5: Agregación (test falla)**

Create `src/lib/analytics/aggregate.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { summarize } from './aggregate'
import type { EventRecord } from './events'

const HOUR = 1000 * 60 * 60
function ev(p: Partial<EventRecord>): EventRecord {
  return {
    id: 0, type: 'open_challenge', userId: 1, path: '/', sessionId: 's', userAgent: '',
    referrer: '', meta: {}, createdAt: 0, ...p,
  }
}

describe('summarize', () => {
  it('cuenta eventos, sesiones y usuarios activos', () => {
    const events = [
      ev({ sessionId: 's1', userId: 1, createdAt: 0 }),
      ev({ sessionId: 's1', userId: 1, createdAt: HOUR }),
      ev({ sessionId: 's2', userId: 2, createdAt: 0 }),
    ]
    const s = summarize(events)
    expect(s.totalEvents).toBe(3)
    expect(s.sessions).toBe(2)
    expect(s.activeUsers).toBe(2)
  })

  it('calcula rebote (sesiones con un solo evento)', () => {
    const events = [
      ev({ sessionId: 's1', createdAt: 0 }),
      ev({ sessionId: 's1', createdAt: HOUR }),
      ev({ sessionId: 's2', createdAt: 0 }), // rebote
    ]
    const s = summarize(events)
    expect(s.bounceSessions).toBe(1)
  })

  it('duración media de sesión = media de (último-primer evento)', () => {
    const events = [
      ev({ sessionId: 's1', createdAt: 0 }),
      ev({ sessionId: 's1', createdAt: 2 * HOUR }), // dura 2h
      ev({ sessionId: 's2', createdAt: 0 }),        // dura 0
    ]
    const s = summarize(events)
    expect(s.avgSessionMs).toBe(HOUR) // media de 2h y 0 = 1h
  })

  it('agrupa actividad por hora del día (0-23)', () => {
    const s = summarize([ev({ createdAt: 0 })]) // epoch = 00:00 UTC
    expect(s.byHour).toHaveLength(24)
    expect(s.byHour.reduce((a, b) => a + b, 0)).toBe(1)
  })
})
```

- [ ] **Step 6: Implementar agregación**

Create `src/lib/analytics/aggregate.ts`:
```typescript
import type { EventRecord } from './events'

export interface Summary {
  totalEvents: number
  sessions: number
  activeUsers: number
  bounceSessions: number
  avgSessionMs: number
  byHour: number[] // 24 posiciones
}

export function summarize(events: EventRecord[]): Summary {
  const bySession = new Map<string, number[]>() // sessionId -> timestamps
  const users = new Set<number>()
  const byHour = new Array(24).fill(0) as number[]

  for (const e of events) {
    if (!bySession.has(e.sessionId)) bySession.set(e.sessionId, [])
    bySession.get(e.sessionId)!.push(e.createdAt)
    if (e.userId != null) users.add(e.userId)
    byHour[new Date(e.createdAt).getUTCHours()]++
  }

  let bounce = 0
  let totalDuration = 0
  for (const ts of bySession.values()) {
    if (ts.length === 1) bounce++
    totalDuration += Math.max(...ts) - Math.min(...ts)
  }

  return {
    totalEvents: events.length,
    sessions: bySession.size,
    activeUsers: users.size,
    bounceSessions: bounce,
    avgSessionMs: bySession.size ? Math.round(totalDuration / bySession.size) : 0,
    byHour,
  }
}
```

> Nota: `byHour` usa UTC para ser determinista en tests; la página puede etiquetar "hora (UTC)".

- [ ] **Step 7:** `npm test -- analytics/aggregate` → PASS (4).

- [ ] **Step 8: "Dónde se atascan" (puro)**

Añade a `aggregate.ts` (y un test) una función:
```typescript
export interface StuckRow { challengeId: number; current: number; avgAttempts: number }

/** progress: filas {challengeId, status, attempts}; journeys: filas {currentNode}; nodeToChallenge: map. */
export function stuckReport(
  progress: { challengeId: number; status: string; attempts: number }[],
): StuckRow[] {
  const byChallenge = new Map<number, { attempts: number[]; stuck: number }>()
  for (const p of progress) {
    if (!byChallenge.has(p.challengeId)) byChallenge.set(p.challengeId, { attempts: [], stuck: 0 })
    const e = byChallenge.get(p.challengeId)!
    e.attempts.push(p.attempts)
    if (p.status !== 'completed') e.stuck++
  }
  return [...byChallenge.entries()].map(([challengeId, e]) => ({
    challengeId,
    current: e.stuck,
    avgAttempts: e.attempts.length ? e.attempts.reduce((a, b) => a + b, 0) / e.attempts.length : 0,
  }))
}
```
Test mínimo: dos filas mismo reto, una completada y una no → `current=1`, `avgAttempts` correcto.

- [ ] **Step 9: API + página**

Create `src/app/api/admin/analytics/route.ts` (GET, exige admin): construye `summarize(logger.listAll())`, agrupa dispositivos/navegadores con `parseUserAgent`, y `stuckReport` sobre `progress`. Devuelve JSON.
Create `src/app/admin/analytics/page.tsx`: muestra tarjetas (eventos, sesiones, usuarios activos, rebote, duración media), barras de actividad por hora, tablas de dispositivos/navegadores y "dónde se atascan".

> Recordatorio del spec §8: la geolocalización por IP no aplica en red local; no implementamos ese widget.

- [ ] **Step 10:** `npm test` → PASS. Manual: genera tráfico y revisa `/admin/analytics`.

- [ ] **Step 11: Commit**
```bash
git add -A && git commit -m "feat(d): analítica (parser UA, agregación, atascos) + página"
```

---

### Task D7: Edición de contenido y grafo

**Files:**
- Modify: `src/lib/curriculum/repository.ts` (métodos de edición), `src/lib/story/repository.ts` (edición de aristas)
- Create: `src/app/api/admin/content/...` (rutas), `src/app/admin/content/page.tsx`
- Test: `src/lib/curriculum/edit.test.ts`

**Contexto:** El admin edita conceptos, retos, variantes, **solución de referencia**, **input_spec** y el **grafo** (aristas por estrellas). Alcance pragmático: editar retos existentes y reconectar aristas; crear nuevos retos/variantes con formulario. La validación del autor (solución de referencia) se puede **probar** desde el panel ejecutándola contra entradas generadas (reusa `expectedOutputs` de Hito B — código de confianza).

- [ ] **Step 1: Métodos de edición (test falla)**

Create `src/lib/curriculum/edit.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../db/schema'
import { seedCurriculum } from './seed'
import { CurriculumRepository } from './repository'

function setup() {
  const db = new Database(':memory:')
  createSchema(db)
  seedCurriculum(db)
  return new CurriculumRepository(db)
}

describe('edición de contenido', () => {
  it('actualiza la solución de referencia y el input_spec de un reto', () => {
    const repo = setup()
    const before = repo.getChallengeBySlug('contar')!
    repo.updateChallengeGrading(before.id, {
      referenceSolution: 'print("nuevo")',
      inputSpec: { cases: [{ type: 'fixed', value: null }] },
    })
    const after = repo.getChallengeBySlug('contar')!
    expect(after.referenceSolution).toBe('print("nuevo")')
    expect(after.inputSpec.cases?.[0]).toEqual({ type: 'fixed', value: null })
  })

  it('actualiza el enunciado de una variante', () => {
    const repo = setup()
    const ch = repo.getChallengeBySlug('contar')!
    repo.updateVariantStatement(ch.id, 'python', 'Nuevo enunciado')
    const after = repo.getChallengeBySlug('contar')!
    expect(after.variants.python!.statement).toBe('Nuevo enunciado')
  })
})
```

- [ ] **Step 2:** `npm test -- curriculum/edit` → FAIL.

- [ ] **Step 3: Implementar métodos**

En `src/lib/curriculum/repository.ts` añade:
```typescript
  updateChallengeGrading(
    challengeId: number,
    data: { referenceSolution: string; inputSpec: object },
  ): void {
    this.db
      .prepare('UPDATE challenges SET reference_solution = ?, input_spec = ? WHERE id = ?')
      .run(data.referenceSolution, JSON.stringify(data.inputSpec), challengeId)
  }

  updateVariantStatement(challengeId: number, language: string, statement: string): void {
    this.db
      .prepare('UPDATE challenge_variants SET statement = ? WHERE challenge_id = ? AND language = ?')
      .run(statement, challengeId, language)
  }
```

- [ ] **Step 4: Edición de aristas del grafo**

En `src/lib/story/repository.ts` añade (con su test en `repository.test.ts`):
```typescript
  setEdge(fromNode: number, outcome: '3star' | '2star', toNode: number): void {
    this.db
      .prepare(
        `INSERT INTO story_edges (from_node, outcome, to_node) VALUES (?, ?, ?)
         ON CONFLICT(from_node, outcome) DO UPDATE SET to_node = excluded.to_node`,
      )
      .run(fromNode, outcome, toNode)
  }
```
Test: `setEdge(n, '3star', m)` y luego `listEdges()` contiene `{fromNode:n, outcome:'3star', toNode:m}`; volver a llamar con otro `toNode` lo actualiza (no duplica).

- [ ] **Step 5: Rutas + página**

Create rutas bajo `src/app/api/admin/content/` (exigen admin) para: listar retos, actualizar grading (solución/input_spec), actualizar enunciado de variante, y setear aristas. Incluye un endpoint `POST /api/admin/content/test-reference` que ejecuta `expectedOutputs(refCode, generateInputs(spec, Math.random))` y devuelve la salida, para que el autor verifique su solución antes de guardar.
Create `src/app/admin/content/page.tsx`: editor por reto (textareas de solución de referencia e input_spec con botón "Probar", enunciados por lenguaje) y editor de aristas del grafo (selects desde/hacia por resultado).

- [ ] **Step 6:** `npm test` → PASS. Manual: cambia la solución de referencia de un reto, pruébala, guarda, resuelve el reto como alumno → coherente. Reconecta una arista 3★ y verifica el avance.

- [ ] **Step 7: Commit**
```bash
git add -A && git commit -m "feat(d): edición de contenido (grading, variantes) y aristas del grafo"
```

---

### Task D8: Cola de revisión de apelaciones + ajustes

**Files:**
- Create: `src/lib/appeals/resolve.ts`, `src/lib/appeals/resolve.test.ts`
- Modify: `src/lib/appeals/repository.ts` (resolve)
- Create: `src/app/api/admin/appeals/route.ts`, `src/app/admin/appeals/page.tsx`
- Create: `src/app/api/admin/settings/route.ts`, `src/app/admin/settings/page.tsx`

**Contexto:** El admin ve la cola de pendientes y **acepta** (otorga estrellas/aprobado vía progreso) o **rechaza** (con feedback; marca `resolved_at` para el cooldown). Spec §7: el código apelado **nunca se ejecuta**. Ajustes: editar límites de apelación y el modo mantenimiento (settings de C1/D3).

- [ ] **Step 1: Lógica de resolución (test falla)**

Create `src/lib/appeals/resolve.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../db/schema'
import { seedCurriculum } from '../curriculum/seed'
import { UserRepository } from '../users/repository'
import { AppealRepository } from './repository'
import { ProgressRepository } from '../progress/repository'
import { resolveAppeal } from './resolve'

function setup() {
  const db = new Database(':memory:')
  createSchema(db)
  seedCurriculum(db)
  const user = new UserRepository(db).findOrCreateByUsername('ana')
  const admin = new UserRepository(db).findByUsername('root')!
  const challengeId = (db.prepare("SELECT id FROM challenges WHERE slug='saludo'").get() as { id: number }).id
  const appeals = new AppealRepository(db)
  const progress = new ProgressRepository(db)
  const appealId = appeals.create({ userId: user.id, challengeId, language: 'js', submittedCode: 'x', submittedOutput: 'y', message: '' })
  return { db, appeals, progress, appealId, adminId: admin.id, userId: user.id, challengeId }
}

describe('resolveAppeal', () => {
  it('aceptar marca la apelación y otorga progreso completado con estrellas', () => {
    const { appeals, progress, appealId, adminId, userId, challengeId } = setup()
    resolveAppeal({ appeals, progress }, { appealId, adminId, accept: true, stars: 3, feedback: '¡Bien visto!' })
    const a = appeals.getById(appealId)!
    expect(a.status).toBe('accepted')
    expect(a.reviewerAdminId).toBe(adminId)
    expect(a.resolvedAt).not.toBeNull()
    expect(progress.get(userId, challengeId)!.status).toBe('completed')
    expect(progress.get(userId, challengeId)!.stars).toBe(3)
  })

  it('rechazar marca la apelación con feedback y resolved_at (para cooldown)', () => {
    const { appeals, progress, appealId, adminId } = setup()
    resolveAppeal({ appeals, progress }, { appealId, adminId, accept: false, feedback: 'La salida no coincide.' })
    const a = appeals.getById(appealId)!
    expect(a.status).toBe('rejected')
    expect(a.feedback).toMatch(/no coincide/i)
    expect(a.resolvedAt).not.toBeNull()
  })
})
```

- [ ] **Step 2:** `npm test -- appeals/resolve` → FAIL.

- [ ] **Step 3: Método resolve en el repositorio**

En `src/lib/appeals/repository.ts` añade:
```typescript
  resolve(id: number, adminId: number, status: 'accepted' | 'rejected', feedback: string): void {
    this.db
      .prepare(
        `UPDATE review_requests SET status = ?, reviewer_admin_id = ?, feedback = ?, resolved_at = ?
         WHERE id = ? AND status = 'pending'`,
      )
      .run(status, adminId, feedback, Date.now(), id)
  }
```

- [ ] **Step 4: Orquestación resolveAppeal**

Create `src/lib/appeals/resolve.ts`:
```typescript
import type { AppealRepository } from './repository'
import type { ProgressRepository } from '../progress/repository'

export interface ResolveDeps {
  appeals: AppealRepository
  progress: ProgressRepository
}

export interface ResolveInput {
  appealId: number
  adminId: number
  accept: boolean
  stars?: number
  feedback: string
}

/** Resuelve una apelación. NUNCA ejecuta el código apelado. */
export function resolveAppeal(deps: ResolveDeps, input: ResolveInput): void {
  const appeal = deps.appeals.getById(input.appealId)
  if (!appeal || appeal.status !== 'pending') return
  if (input.accept) {
    deps.appeals.resolve(input.appealId, input.adminId, 'accepted', input.feedback)
    deps.progress.recordAttempt(appeal.userId, appeal.challengeId, {
      stars: input.stars ?? 2,
      hintsUsed: 0,
      completed: true,
    })
  } else {
    deps.appeals.resolve(input.appealId, input.adminId, 'rejected', input.feedback)
  }
}
```

- [ ] **Step 5:** `npm test -- appeals/resolve` → PASS (2).

- [ ] **Step 6: API + página de la cola**

Create `src/app/api/admin/appeals/route.ts`: `GET` lista pendientes (con título de reto y username del alumno); `POST` resuelve (acepta/rechaza) usando `resolveAppeal`. Exige admin. Devuelve el código apelado para lectura humana, marcando claramente que **no se ejecuta**.
Create `src/app/admin/appeals/page.tsx`: lista de pendientes mostrando código + salida + mensaje; botones Aceptar (con selector de estrellas) y Rechazar (con feedback).

- [ ] **Step 7: Ajustes (settings)**

Create `src/app/api/admin/settings/route.ts`: `GET` devuelve `settings.all()`; `POST` aplica cambios (límites de apelación, `maintenance.enabled`). Exige admin.
Create `src/app/admin/settings/page.tsx`: formulario para límites y un toggle de mantenimiento.

- [ ] **Step 8:** `npm test` → PASS. Manual end-to-end: alumno apela → admin ve en cola → acepta con 3★ → alumno ve "Aceptada" y el reto completado; otro alumno apela → admin rechaza con feedback → alumno ve "No aceptada" + feedback y no puede reapelar hasta pasado el cooldown.

- [ ] **Step 9: Commit**
```bash
git add -A && git commit -m "feat(d): cola de revisión de apelaciones y panel de ajustes"
```

---

### Task D9: Documentación y cierre del MVP

**Files:**
- Create/Modify: `README.md`, `docs/` (arquitectura final)

- [ ] **Step 1:** Documenta: arquitectura final (3 motores, validación por referencia, grafo, apelaciones, admin, eventos), cómo arrancar, cómo cambiar la contraseña de root (`changeme` por defecto → cambiar en primer arranque vía Ajustes), nota de Pyodide offline, y la nota de seguridad sobre hash sha256 (suficiente para el Fab Lab local; reforzar al pasar a online).
- [ ] **Step 2:** Verifica la batería completa: `npm test` → PASS.
- [ ] **Step 3: Commit**
```bash
git add -A && git commit -m "docs: arquitectura final del MVP (apelaciones + panel de admin)"
```

---
---

## Self-Review — cobertura del spec

**Parte C (Hito C — Apelaciones, spec §7):**
- Settings con límites configurables → C1.
- Tabla `review_requests` con todos los campos del §10 → C2.
- Tres reglas (1/reto, 3 globales, cooldown 24 h) como lógica pura testeada → C3, aplicadas en C5.
- Repositorio sin ejecutar código + creación/conteos → C4.
- Botón "Creo que mi solución es válida" + estado en perfil → C6.
- Código apelado **se guarda, nunca se ejecuta** → C4/C5 (solo INSERT) y D8 (resolución no ejecuta).

**Parte D (Hito D — Panel de admin, spec §8):**
- Acceso con contraseña solo admin/root + cierre del agujero de login por nombre → D1.
- Guard + layout del panel → D2.
- Modo mantenimiento (decisión pura + gate, leyendo la guía de middleware de esta versión de Next) → D3.
- Gestión de usuarios: crear admins solo por admins, `hidden` no asignable, root intocable → D4.
- Registro de eventos "desde el día uno" (retrofit) → D5.
- Analítica: overview, rebote, duración, actividad por hora, dispositivos/navegadores, "dónde se atascan" → D6 (geo omitida a propósito, red local).
- Edición de contenido (solución de referencia, input_spec, variantes) y grafo (aristas) + probar la referencia → D7.
- Cola de apelaciones (aceptar con estrellas / rechazar con feedback) + ajustes → D8.

**Riesgos / notas:**
- **Middleware de mantenimiento:** la API de middleware de esta versión de Next puede no permitir SQLite (edge). El plan ofrece fallback a layout server component reutilizando la misma decisión pura. **Leer `node_modules/next/dist/docs/` antes (AGENTS.md).**
- **Hash sha256** se mantiene por coherencia con `seedRoot`; suficiente para uso local del Fab Lab. Al saltar a online (fuera del MVP) migrar a bcrypt/scrypt.
- **Contraseña root por defecto `changeme`:** documentar el cambio en el primer arranque (Ajustes → o `setPassword`).
- **Analítica determinista:** `byHour` en UTC para tests estables; la UI lo etiqueta.

**Fuera del MVP (spec §12):** estética/ambientación/música; plataforma online + contraseñas encriptadas para todos los alumnos.
