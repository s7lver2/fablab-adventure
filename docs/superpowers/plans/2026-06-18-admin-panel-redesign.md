# Admin Panel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bare admin panel with a 9-section design (Resumen, En vivo, Analítica, Sesiones, Alumnos, Apelaciones, Contenido, Auditoría, Ajustes) featuring a persistent sidebar, Chart.js charts, and new API routes for live feed, sessions, appeals resolution, audit log, and settings.

**Architecture:** `AdminSidebar` is a `'use client'` component placed in layout; pages are Server Components where possible, `'use client'` only for chart/form interactivity. New API routes are added alongside existing ones. `EventLogger` gains three query methods. All styling uses inline styles + CSS variables — no new CSS files.

**Tech Stack:** Next.js 16.2.9, React 19, better-sqlite3, chart.js (to install), TypeScript

## Global Constraints

- Inline styles only — no new CSS files, no Tailwind, no CSS modules
- CSS variables: `var(--color-text-primary/secondary/tertiary)`, `var(--color-text-success/info/warning/danger)`, `var(--color-background-primary/secondary)`, `var(--color-background-success/info/warning/danger)`, `var(--color-border-tertiary/secondary/primary)`, `var(--border-radius-md)`, `var(--border-radius-lg)`, `var(--font-mono)`, `var(--font-sans)`
- All stats, slugs, labels, and timestamps use `fontFamily: 'var(--font-mono)'`
- Admin auth: `isAdmin(user)` from `@/lib/auth/guard`, session via `getCurrentUser` from `@/lib/session/server`
- API errors: `NextResponse.json({ error: '...' }, { status: N })`
- No TypeScript `any` unless forced by better-sqlite3 typed results — use explicit row interfaces
- Chart.js imported as `import Chart from 'chart.js/auto'`

---

### Task 1: Install chart.js + AdminSidebar + Layout

**Files:**
- Create: `src/app/admin/(protected)/components/AdminSidebar.tsx`
- Modify: `src/app/admin/(protected)/layout.tsx`

**Interfaces:**
- Produces: `<AdminSidebar username="root" role="root" pendingAppeals={3} />` — used in layout

- [ ] **Step 1: Install chart.js**

```bash
npm install chart.js
```

Expected: `package.json` gains `"chart.js": "^4.x.x"`.

- [ ] **Step 2: Create AdminSidebar.tsx**

Create `src/app/admin/(protected)/components/AdminSidebar.tsx`:

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  username: string
  role: string
  pendingAppeals: number
}

const NAV_GROUPS = [
  [
    { href: '/admin', label: 'Resumen', icon: '▦' },
    { href: '/admin/live', label: 'En vivo', icon: '◉' },
    { href: '/admin/analytics', label: 'Analítica', icon: '↗' },
    { href: '/admin/sessions', label: 'Sesiones', icon: '◷' },
  ],
  [
    { href: '/admin/users', label: 'Alumnos', icon: '◎' },
    { href: '/admin/appeals', label: 'Apelaciones', icon: '◈' },
    { href: '/admin/content', label: 'Contenido', icon: '▤' },
  ],
  [
    { href: '/admin/audit', label: 'Auditoría', icon: '◫' },
    { href: '/admin/settings', label: 'Ajustes', icon: '⚙' },
  ],
]

export function AdminSidebar({ username, role, pendingAppeals }: Props) {
  const pathname = usePathname()

  function isActive(href: string) {
    return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
  }

  return (
    <div style={{
      width: 170, minWidth: 170, borderRight: '0.5px solid var(--color-border-tertiary)',
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      background: 'var(--color-background-primary)',
    }}>
      <div style={{ padding: '0.875rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Fab Lab Quest</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Panel admin</div>
      </div>

      <nav style={{ padding: '0.375rem 0', flex: 1 }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && <div style={{ height: '0.5px', background: 'var(--color-border-tertiary)', margin: '0.375rem 1rem' }} />}
            {group.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 1rem', fontSize: 12, textDecoration: 'none',
                  color: isActive(item.href) ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  borderLeft: `2px solid ${isActive(item.href) ? 'var(--color-text-success)' : 'transparent'}`,
                  background: isActive(item.href) ? 'var(--color-background-secondary)' : 'transparent',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{item.icon}</span>
                {item.label}
                {item.href === '/admin/appeals' && pendingAppeals > 0 && (
                  <span style={{
                    marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10,
                    background: 'var(--color-background-danger)', color: 'var(--color-text-danger)',
                    padding: '1px 5px', borderRadius: 99,
                  }}>{pendingAppeals}</span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div style={{ padding: '0.75rem 1rem', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
            background: 'var(--color-background-warning)', color: 'var(--color-text-warning)', flexShrink: 0,
          }}>{username.slice(0, 2).toUpperCase()}</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>{username}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-warning)' }}>⭑ {role}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Rewrite layout.tsx**

Replace `src/app/admin/(protected)/layout.tsx` with:

```tsx
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { AppealRepository } from '@/lib/appeals/repository'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'
import { AdminSidebar } from './components/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!isAdmin(user)) redirect('/admin/login')

  const pendingAppeals = new AppealRepository(db).listPending().length

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminSidebar
        username={user.username}
        role={user.role}
        pendingAppeals={pendingAppeals}
      />
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--color-background-primary)' }}>
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Start dev server and verify**

```bash
npm run dev
```

Open `http://localhost:3000/admin/login`, log in as `root` / `changeme`.
Expected: sidebar appears on the left with 9 nav links, active page highlighted in teal.

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(protected)/components/AdminSidebar.tsx" "src/app/admin/(protected)/layout.tsx" package.json package-lock.json
git commit -m "feat(admin): add persistent sidebar and install chart.js"
```

---

### Task 2: EventLogger enhancements

**Files:**
- Modify: `src/lib/analytics/events.ts`

**Interfaces:**
- Consumes: nothing new
- Produces:
  - `EventLogger.listRecent(windowMs: number): EventRecord[]` — events from now minus `windowMs`
  - `EventLogger.listByTypes(types: string[]): EventRecord[]` — events filtered by type array
  - `EventLogger.listSessions(windowMs: number): SessionSummary[]` — aggregate per session_id
  - `interface SessionSummary { sessionId: string; userId: number | null; startedAt: number; lastSeenAt: number; durationMs: number; eventCount: number; userAgent: string }`

- [ ] **Step 1: Add methods to EventLogger**

Replace `src/lib/analytics/events.ts` with:

```ts
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

export interface SessionSummary {
  sessionId: string
  userId: number | null
  startedAt: number
  lastSeenAt: number
  durationMs: number
  eventCount: number
  userAgent: string
}

interface RawRow {
  id: number; type: string; user_id: number | null; path: string; session_id: string
  user_agent: string; referrer: string; meta_json: string; created_at: number
}

function toRecord(r: RawRow): EventRecord {
  return {
    id: r.id, type: r.type, userId: r.user_id, path: r.path, sessionId: r.session_id,
    userAgent: r.user_agent, referrer: r.referrer, meta: JSON.parse(r.meta_json), createdAt: r.created_at,
  }
}

export class EventLogger {
  constructor(private db: Database.Database) {}

  log(e: EventInput): void {
    this.db
      .prepare(
        `INSERT INTO events (type, user_id, path, session_id, user_agent, referrer, meta_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(e.type, e.userId ?? null, e.path ?? '', e.sessionId ?? '', e.userAgent ?? '',
        e.referrer ?? '', JSON.stringify(e.meta ?? {}), Date.now())
  }

  listAll(): EventRecord[] {
    return (this.db.prepare('SELECT * FROM events ORDER BY created_at').all() as RawRow[]).map(toRecord)
  }

  listRecent(windowMs: number): EventRecord[] {
    const since = Date.now() - windowMs
    return (this.db.prepare(
      'SELECT * FROM events WHERE created_at >= ? ORDER BY created_at DESC'
    ).all(since) as RawRow[]).map(toRecord)
  }

  listByTypes(types: string[]): EventRecord[] {
    if (types.length === 0) return []
    const placeholders = types.map(() => '?').join(',')
    return (this.db.prepare(
      `SELECT * FROM events WHERE type IN (${placeholders}) ORDER BY created_at DESC`
    ).all(...types) as RawRow[]).map(toRecord)
  }

  listSessions(windowMs: number): SessionSummary[] {
    const since = Date.now() - windowMs
    const rows = this.db.prepare(
      `SELECT session_id, user_id, user_agent,
              MIN(created_at) AS started_at, MAX(created_at) AS last_seen_at, COUNT(*) AS event_count
       FROM events WHERE created_at >= ? AND session_id != ''
       GROUP BY session_id ORDER BY last_seen_at DESC`
    ).all(since) as {
      session_id: string; user_id: number | null; user_agent: string
      started_at: number; last_seen_at: number; event_count: number
    }[]
    return rows.map((r) => ({
      sessionId: r.session_id, userId: r.user_id, userAgent: r.user_agent,
      startedAt: r.started_at, lastSeenAt: r.last_seen_at,
      durationMs: r.last_seen_at - r.started_at, eventCount: r.event_count,
    }))
  }
}
```

- [ ] **Step 2: Verify existing tests still pass**

```bash
npm test
```

Expected: all tests pass (no broken imports — `listAll` signature unchanged).

- [ ] **Step 3: Commit**

```bash
git add src/lib/analytics/events.ts
git commit -m "feat(analytics): add listRecent, listByTypes, listSessions to EventLogger"
```

---

### Task 3: Admin Appeals API + AppealRepository.resolve

**Files:**
- Modify: `src/lib/appeals/repository.ts`
- Create: `src/app/api/admin/appeals/route.ts`

**Interfaces:**
- Consumes: `AppealRepository.listPending()`, `AppealRepository.getById(id)` (both already exist)
- Produces:
  - `AppealRepository.resolve(id, status, feedback, reviewerId)` — UPDATE review_requests
  - `GET /api/admin/appeals` → `Appeal[]`
  - `PATCH /api/admin/appeals` body `{ id: number; status: 'accepted'|'rejected'; feedback?: string }` → `{ ok: true }`

- [ ] **Step 1: Add resolve() to AppealRepository**

Add this method to the `AppealRepository` class in `src/lib/appeals/repository.ts`, after `lastRejectedAt`:

```ts
  resolve(id: number, status: 'accepted' | 'rejected', feedback: string, reviewerId: number): void {
    this.db
      .prepare(
        `UPDATE review_requests SET status = ?, reviewer_admin_id = ?, feedback = ?, resolved_at = ?
         WHERE id = ?`,
      )
      .run(status, reviewerId, feedback, Date.now(), id)
  }
```

- [ ] **Step 2: Create admin appeals route**

Create `src/app/api/admin/appeals/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { AppealRepository } from '@/lib/appeals/repository'
import { EventLogger } from '@/lib/analytics/events'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'

export async function GET() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!isAdmin(user)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const appeals = new AppealRepository(db).listPending()
  return NextResponse.json(appeals)
}

export async function PATCH(req: Request) {
  const db = getDb()
  const users = new UserRepository(db)
  const user = await getCurrentUser(users)
  if (!isAdmin(user)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const body = await req.json() as { id: number; status: string; feedback?: string }
  const { id, status, feedback = '' } = body

  if (!id || (status !== 'accepted' && status !== 'rejected')) {
    return NextResponse.json({ error: 'Parámetros inválidos.' }, { status: 400 })
  }

  const appeals = new AppealRepository(db)
  const appeal = appeals.getById(id)
  if (!appeal) return NextResponse.json({ error: 'Apelación no encontrada.' }, { status: 404 })

  appeals.resolve(id, status, feedback, user.id)

  new EventLogger(db).log({
    type: status === 'accepted' ? 'admin:appeal_accept' : 'admin:appeal_reject',
    userId: user.id,
    meta: { appealId: id, reviewedBy: user.username },
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Verify the route responds**

With dev server running:
```bash
curl -s http://localhost:3000/api/admin/appeals
```

Expected: `{"error":"No autorizado."}` (no cookie) or `[]` (logged-in admin with no pending appeals).

- [ ] **Step 4: Commit**

```bash
git add src/lib/appeals/repository.ts "src/app/api/admin/appeals/route.ts"
git commit -m "feat(admin): add appeals admin API with audit logging"
```

---

### Task 4: Live API

**Files:**
- Create: `src/app/api/admin/live/route.ts`

**Interfaces:**
- Consumes: `EventLogger.listRecent(windowMs)` (Task 2), `UserRepository.findById(id)` (existing)
- Produces:
  - `GET /api/admin/live` → `{ activeCount: number; activeStudents: ActiveStudent[]; recentEvents: LiveEvent[] }`
  - `interface ActiveStudent { userId: number; username: string; currentPath: string; lastSeenMs: number }`
  - `interface LiveEvent { timestamp: number; type: string; username: string; path: string }`

- [ ] **Step 1: Create live route**

Create `src/app/api/admin/live/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { EventLogger } from '@/lib/analytics/events'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'

const ACTIVE_WINDOW_MS = 5 * 60 * 1000

export async function GET() {
  const db = getDb()
  const userRepo = new UserRepository(db)
  const user = await getCurrentUser(userRepo)
  if (!isAdmin(user)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const events = new EventLogger(db).listRecent(ACTIVE_WINDOW_MS)

  const byUser = new Map<number, { path: string; lastSeenMs: number }>()
  for (const e of events) {
    if (e.userId == null) continue
    const existing = byUser.get(e.userId)
    if (!existing || e.createdAt > existing.lastSeenMs) {
      byUser.set(e.userId, { path: e.path, lastSeenMs: e.createdAt })
    }
  }

  const activeStudents = [...byUser.entries()]
    .sort((a, b) => b[1].lastSeenMs - a[1].lastSeenMs)
    .map(([userId, data]) => {
      const u = userRepo.findById(userId)
      return { userId, username: u?.username ?? String(userId), currentPath: data.path, lastSeenMs: data.lastSeenMs }
    })

  const recentEvents = events.slice(0, 20).map((e) => {
    const u = e.userId != null ? userRepo.findById(e.userId) : null
    return { timestamp: e.createdAt, type: e.type, username: u?.username ?? 'anon', path: e.path }
  })

  return NextResponse.json({ activeCount: activeStudents.length, activeStudents, recentEvents })
}
```

- [ ] **Step 2: Verify**

```bash
curl -s http://localhost:3000/api/admin/live
```

Expected (no cookie): `{"error":"No autorizado."}`.
Expected (logged-in admin): `{"activeCount":0,"activeStudents":[],"recentEvents":[]}`.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/admin/live/route.ts"
git commit -m "feat(admin): add live students API"
```

---

### Task 5: Sessions API

**Files:**
- Create: `src/app/api/admin/sessions/route.ts`

**Interfaces:**
- Consumes: `EventLogger.listSessions(windowMs)` (Task 2), `UserRepository.findById(id)` (existing), `parseUserAgent` from `@/lib/analytics/user-agent`
- Produces:
  - `GET /api/admin/sessions` → `{ summary: SessionStats; sessions: SessionRow[] }`
  - `interface SessionStats { today: number; avgDurationMs: number; bounceRate: number }`
  - `interface SessionRow { sessionId: string; username: string; startedAt: number; durationMs: number; eventCount: number; device: string; browser: string }`

- [ ] **Step 1: Create sessions route**

Create `src/app/api/admin/sessions/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { EventLogger } from '@/lib/analytics/events'
import { parseUserAgent } from '@/lib/analytics/user-agent'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'

const DAY_MS = 24 * 60 * 60 * 1000

export async function GET() {
  const db = getDb()
  const userRepo = new UserRepository(db)
  const user = await getCurrentUser(userRepo)
  if (!isAdmin(user)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const sessions = new EventLogger(db).listSessions(DAY_MS)

  const avgDurationMs = sessions.length
    ? Math.round(sessions.reduce((acc, s) => acc + s.durationMs, 0) / sessions.length)
    : 0
  const bounceSessions = sessions.filter((s) => s.eventCount === 1).length
  const bounceRate = sessions.length ? Math.round((bounceSessions / sessions.length) * 100) : 0

  const sessionRows = sessions.map((s) => {
    const u = s.userId != null ? userRepo.findById(s.userId) : null
    const ua = parseUserAgent(s.userAgent)
    return {
      sessionId: s.sessionId,
      username: u?.username ?? 'anónimo',
      startedAt: s.startedAt,
      durationMs: s.durationMs,
      eventCount: s.eventCount,
      device: ua.device,
      browser: ua.browser,
    }
  })

  return NextResponse.json({
    summary: { today: sessions.length, avgDurationMs, bounceRate },
    sessions: sessionRows,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/api/admin/sessions/route.ts"
git commit -m "feat(admin): add sessions API"
```

---

### Task 6: Audit API + audit logging in user routes

**Files:**
- Create: `src/app/api/admin/audit/route.ts`
- Modify: `src/app/api/admin/users/route.ts`

**Interfaces:**
- Consumes: `EventLogger.listByTypes(types)` (Task 2), `UserRepository.findById` (existing)
- Produces:
  - `GET /api/admin/audit` → `AuditEntry[]`
  - `interface AuditEntry { id: number; timestamp: number; adminUsername: string; type: string; meta: Record<string, unknown> }`

- [ ] **Step 1: Create audit route**

Create `src/app/api/admin/audit/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { EventLogger } from '@/lib/analytics/events'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'

const ADMIN_TYPES = [
  'admin:appeal_accept', 'admin:appeal_reject',
  'admin:user_create', 'admin:role_change',
  'admin:maintenance_on', 'admin:maintenance_off',
]

export async function GET() {
  const db = getDb()
  const userRepo = new UserRepository(db)
  const user = await getCurrentUser(userRepo)
  if (!isAdmin(user)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const events = new EventLogger(db).listByTypes(ADMIN_TYPES)

  const entries = events.slice(0, 100).map((e) => {
    const admin = e.userId != null ? userRepo.findById(e.userId) : null
    return { id: e.id, timestamp: e.createdAt, adminUsername: admin?.username ?? '?', type: e.type, meta: e.meta }
  })

  return NextResponse.json(entries)
}
```

- [ ] **Step 2: Add audit logging to users route**

In `src/app/api/admin/users/route.ts`:

Add import at the top:
```ts
import { EventLogger } from '@/lib/analytics/events'
```

In the `POST` handler, after `users.createAdmin(...)`:
```ts
    new EventLogger(db).log({ type: 'admin:user_create', userId: actor.id, meta: { username } })
```

In the `PATCH` handler, after `users.setRole(...)`:
```ts
  new EventLogger(db).log({ type: 'admin:role_change', userId: actor.id, meta: { targetId, newRole } })
```

The full updated `src/app/api/admin/users/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { EventLogger } from '@/lib/analytics/events'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'
import { canCreateAdmin, canChangeRole } from '@/lib/users/admin-rules'

export async function GET() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!isAdmin(user)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const repo = new UserRepository(db)
  const users = repo.listAll(false)
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const db = getDb()
  const users = new UserRepository(db)
  const actor = await getCurrentUser(users)
  if (!isAdmin(actor)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const rule = canCreateAdmin(actor.role)
  if (!rule.allowed) return NextResponse.json({ error: rule.reason }, { status: 403 })

  const body = await req.json()
  const username = String(body.username ?? '').trim().toLowerCase()
  const displayName = String(body.displayName ?? '')
  const password = String(body.password ?? '')

  if (!username || !password) {
    return NextResponse.json({ error: 'Se requieren nombre de usuario y contraseña.' }, { status: 400 })
  }

  try {
    const created = users.createAdmin(username, displayName, password)
    new EventLogger(db).log({ type: 'admin:user_create', userId: actor.id, meta: { username } })
    return NextResponse.json({ ok: true, user: created })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}

export async function PATCH(req: Request) {
  const db = getDb()
  const users = new UserRepository(db)
  const actor = await getCurrentUser(users)
  if (!isAdmin(actor)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const body = await req.json()
  const targetId = Number(body.userId)
  const newRole = String(body.role)

  const target = users.findById(targetId)
  if (!target) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })

  const rule = canChangeRole({ actorRole: actor.role, targetRole: target.role, newRole: newRole as never })
  if (!rule.allowed) return NextResponse.json({ error: rule.reason }, { status: 403 })

  users.setRole(targetId, newRole as never)
  new EventLogger(db).log({ type: 'admin:role_change', userId: actor.id, meta: { targetId, newRole } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/admin/audit/route.ts" "src/app/api/admin/users/route.ts"
git commit -m "feat(admin): add audit API and event logging for user actions"
```

---

### Task 7: Settings API

**Files:**
- Create: `src/app/api/admin/settings/route.ts`

**Interfaces:**
- Consumes: `SettingsRepository.getBool/getNumber/get/set` (all existing)
- Produces:
  - `GET /api/admin/settings` → `SettingsPayload`
  - `PATCH /api/admin/settings` body `{ maintenance?: boolean }` → `{ ok: true }`
  - `interface SettingsPayload { maintenance: boolean; seedVersion: string; appeals: { maxPendingPerChallenge: number; maxPendingGlobal: number; cooldownHours: number } }`

- [ ] **Step 1: Create settings route**

Create `src/app/api/admin/settings/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { SettingsRepository } from '@/lib/settings/repository'
import { EventLogger } from '@/lib/analytics/events'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'

export async function GET() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!isAdmin(user)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const settings = new SettingsRepository(db)
  return NextResponse.json({
    maintenance: settings.getBool('maintenance.enabled'),
    seedVersion: settings.get('seed_version') || '—',
    appeals: {
      maxPendingPerChallenge: settings.getNumber('appeals.maxPendingPerChallenge'),
      maxPendingGlobal: settings.getNumber('appeals.maxPendingGlobal'),
      cooldownHours: settings.getNumber('appeals.cooldownHours'),
    },
  })
}

export async function PATCH(req: Request) {
  const db = getDb()
  const userRepo = new UserRepository(db)
  const user = await getCurrentUser(userRepo)
  if (!isAdmin(user)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const body = await req.json() as Record<string, unknown>
  const settings = new SettingsRepository(db)
  const logger = new EventLogger(db)

  if (typeof body.maintenance === 'boolean') {
    settings.set('maintenance.enabled', String(body.maintenance))
    logger.log({ type: body.maintenance ? 'admin:maintenance_on' : 'admin:maintenance_off', userId: user.id })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/api/admin/settings/route.ts"
git commit -m "feat(admin): add settings API with maintenance toggle and audit logging"
```

---

### Task 8: Overview Page

**Files:**
- Modify: `src/app/admin/(protected)/page.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/analytics`, `GET /api/admin/users`, `GET /api/admin/appeals`

- [ ] **Step 1: Rewrite overview page**

Replace `src/app/admin/(protected)/page.tsx` with:

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'

interface Summary { totalEvents: number; sessions: number; activeUsers: number; bounceSessions: number; avgSessionMs: number; byHour: number[] }
interface StuckRow { challengeId: number; challengeTitle: string; current: number; avgAttempts: number }
interface AnalyticsData { summary: Summary; stuck: StuckRow[] }

function sec(children: React.ReactNode) {
  return <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>{children}</div>
}

function sh(title: string, sub?: string) {
  return (
    <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{title}</span>
      {sub && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)' }}>{sub}</span>}
    </div>
  )
}

function KPI({ label, value, delta, danger }: { label: string; value: React.ReactNode; delta?: string; danger?: boolean }) {
  return (
    <div style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '0.875rem' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: danger ? 'var(--color-text-danger)' : 'var(--color-text-primary)', marginBottom: 3 }}>{value}</div>
      {delta && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: danger ? 'var(--color-text-danger)' : 'var(--color-text-success)' }}>{delta}</div>}
    </div>
  )
}

export default function AdminOverviewPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [userCount, setUserCount] = useState(0)
  const [pendingAppeals, setPendingAppeals] = useState(0)
  const actRef = useRef<HTMLCanvasElement>(null)
  const langRef = useRef<HTMLCanvasElement>(null)
  const actChart = useRef<Chart | null>(null)
  const langChart = useRef<Chart | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/analytics').then((r) => r.json()),
      fetch('/api/admin/users').then((r) => r.json()),
      fetch('/api/admin/appeals').then((r) => r.json()),
    ]).then(([a, u, ap]) => {
      setAnalytics(a)
      setUserCount(Array.isArray(u) ? u.length : 0)
      setPendingAppeals(Array.isArray(ap) ? ap.length : 0)
    })
  }, [])

  useEffect(() => {
    if (!analytics || !actRef.current || !langRef.current) return
    actChart.current?.destroy()
    langChart.current?.destroy()

    const style = getComputedStyle(document.documentElement)
    const grd = style.getPropertyValue('--color-border-tertiary').trim()
    const txt = style.getPropertyValue('--color-text-secondary').trim()
    const scale = { grid: { color: grd }, border: { display: false as const }, ticks: { color: txt, font: { family: 'monospace', size: 10 } } }

    actChart.current = new Chart(actRef.current.getContext('2d')!, {
      type: 'line',
      data: {
        labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Hoy'],
        datasets: [{
          data: analytics.summary.byHour.slice(0, 7),
          borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.08)',
          fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#1D9E75', borderWidth: 1.5,
        }],
      },
      options: { animation: false, plugins: { legend: { display: false } }, scales: { x: scale, y: scale } },
    })

    langChart.current = new Chart(langRef.current.getContext('2d')!, {
      type: 'doughnut',
      data: {
        labels: ['JS', 'Python', 'Bloques'],
        datasets: [{ data: [58, 30, 12], backgroundColor: ['#185FA5', '#1D9E75', '#BA7517'], borderWidth: 0 }],
      },
      options: { animation: false, cutout: '65%', plugins: { legend: { display: true, position: 'bottom', labels: { color: txt, font: { family: 'monospace', size: 10 }, boxWidth: 10, padding: 8 } } } },
    })

    return () => { actChart.current?.destroy(); langChart.current?.destroy() }
  }, [analytics])

  return (
    <div style={{ padding: '1.25rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>sistema</div>
        <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)' }}>Resumen de la plataforma</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, marginBottom: '1rem' }}>
        <KPI label="const totalAlumnos" value={userCount} delta="alumnos registrados" />
        <KPI label="let sesionesHoy" value={analytics?.summary.sessions ?? '—'} delta="sesiones únicas" />
        <KPI label="let apelacionesPendientes" value={pendingAppeals} delta={pendingAppeals > 0 ? '⚠ requieren revisión' : 'al día'} danger={pendingAppeals > 0} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: '1rem' }}>
        {sec(<>{sh('Actividad últimos 7 días', 'eventos')}<div style={{ padding: '0.75rem' }}><canvas ref={actRef} height={120}></canvas></div></>)}
        {sec(<>{sh('Lenguajes')}<div style={{ padding: '0.75rem', display: 'flex', justifyContent: 'center' }}><canvas ref={langRef} width={140} height={140}></canvas></div></>)}
      </div>

      {analytics && sec(<>
        {sh('Dónde se atascan los alumnos', 'atascos activos')}
        {analytics.stuck.length === 0 && (
          <div style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>Sin datos de progreso aún</div>
        )}
        {analytics.stuck.sort((a, b) => b.current - a.current).slice(0, 5).map((s) => (
          <div key={s.challengeId} style={{ padding: '0.55rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-success)', flex: 1 }}>{s.challengeTitle}</span>
            <div style={{ width: 80, height: 4, background: 'var(--color-border-tertiary)', borderRadius: 99 }}>
              <div style={{ width: `${Math.min(100, s.current * 10)}%`, height: '100%', background: 'var(--color-text-danger)', borderRadius: 99 }} />
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', minWidth: 24, textAlign: 'right' }}>{s.current}</span>
          </div>
        ))}
      </>)}
    </div>
  )
}
```

- [ ] **Step 2: Verify overview renders charts**

Go to `http://localhost:3000/admin`. Confirm:
- KPI cards show real numbers
- Line chart renders in the 2/3 column
- Doughnut chart renders in the 1/3 column
- "Dónde se atascan" section shows (or empty state)

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/(protected)/page.tsx"
git commit -m "feat(admin): redesign overview page with Chart.js"
```

---

### Task 9: Live Page

**Files:**
- Create: `src/app/admin/(protected)/live/page.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/live` (Task 4)

- [ ] **Step 1: Create live page**

Create `src/app/admin/(protected)/live/page.tsx`:

```tsx
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
  if (type.includes('pass') || type.includes('complete')) return 'var(--color-text-success)'
  if (type.includes('fail') || type.includes('error')) return 'var(--color-text-danger)'
  if (type.includes('appeal')) return 'var(--color-text-warning)'
  return 'var(--color-text-info)'
}

const AVATAR_BG = ['var(--color-background-info)', 'var(--color-background-success)', 'var(--color-background-warning)', 'var(--color-background-danger)']
const AVATAR_FG = ['var(--color-text-info)', 'var(--color-text-success)', 'var(--color-text-warning)', 'var(--color-text-danger)']

function sec(children: React.ReactNode) {
  return <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>{children}</div>
}

function sh(title: string, sub?: string) {
  return (
    <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{title}</span>
      {sub && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)' }}>{sub}</span>}
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
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>tiempo real</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)' }}>En vivo</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-success)' }}>
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
          <div key={k.label} style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '0.875rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.value}</div>
            {k.delta && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-success)' }}>{k.delta}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {sec(<>
          {sh('Alumnos conectados', 'últimos 5 min')}
          {!data?.activeStudents.length && (
            <div style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>Sin actividad reciente</div>
          )}
          {data?.activeStudents.map((s, i) => (
            <div key={s.userId} style={{ padding: '0.55rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-text-success)', flexShrink: 0 }} />
              <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, background: AVATAR_BG[i % 4], color: AVATAR_FG[i % 4], flexShrink: 0 }}>
                {s.username.slice(0, 2).toUpperCase()}
              </div>
              <span style={{ flex: 1, fontWeight: 500, color: 'var(--color-text-primary)' }}>{s.username}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-success)' }}>{slug(s.currentPath)}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)' }}>{timeAgo(s.lastSeenMs)}</span>
            </div>
          ))}
        </>)}

        {sec(<>
          {sh('Eventos en tiempo real')}
          <div style={{ padding: '0.5rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {!data?.recentEvents.length && <span style={{ color: 'var(--color-text-secondary)' }}>Sin eventos recientes</span>}
            {data?.recentEvents.slice(0, 10).map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', overflow: 'hidden' }}>
                <span style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }}>{new Date(e.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                <span style={{ color: eventColor(e.type), flexShrink: 0 }}>{e.type.split(':').pop()?.toUpperCase() ?? e.type}</span>
                <span style={{ color: 'var(--color-text-primary)', flexShrink: 0 }}>{e.username}</span>
                <span style={{ color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>→ {slug(e.path)}</span>
              </div>
            ))}
          </div>
        </>)}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Go to `http://localhost:3000/admin/live`. Confirm sidebar marks it active, KPI cards show counts, tables show empty states.

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/(protected)/live/page.tsx"
git commit -m "feat(admin): add live page with auto-refresh"
```

---

### Task 10: Analytics Page Redesign

**Files:**
- Modify: `src/app/admin/(protected)/analytics/page.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/analytics` (existing route)

- [ ] **Step 1: Rewrite analytics page**

Replace `src/app/admin/(protected)/analytics/page.tsx` with:

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'

interface Summary { totalEvents: number; sessions: number; activeUsers: number; bounceSessions: number; avgSessionMs: number; byHour: number[] }
interface StuckRow { challengeId: number; challengeTitle: string; current: number }
interface AnalyticsData { summary: Summary; devices: Record<string, number>; browsers: Record<string, number>; stuck: StuckRow[] }

function sec(children: React.ReactNode) {
  return <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>{children}</div>
}

function sh(title: string, sub?: string) {
  return (
    <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{title}</span>
      {sub && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)' }}>{sub}</span>}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const hourlyRef = useRef<HTMLCanvasElement>(null)
  const conceptsRef = useRef<HTMLCanvasElement>(null)
  const hourlyChart = useRef<Chart | null>(null)
  const conceptsChart = useRef<Chart | null>(null)

  useEffect(() => {
    fetch('/api/admin/analytics').then((r) => r.json()).then(setData)
  }, [])

  useEffect(() => {
    if (!data || !hourlyRef.current || !conceptsRef.current) return
    hourlyChart.current?.destroy()
    conceptsChart.current?.destroy()

    const style = getComputedStyle(document.documentElement)
    const grd = style.getPropertyValue('--color-border-tertiary').trim()
    const txt = style.getPropertyValue('--color-text-secondary').trim()
    const scale = { grid: { color: grd }, border: { display: false as const }, ticks: { color: txt, font: { family: 'monospace', size: 10 } } }

    hourlyChart.current = new Chart(hourlyRef.current.getContext('2d')!, {
      type: 'bar',
      data: {
        labels: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')),
        datasets: [{ data: data.summary.byHour, backgroundColor: '#1D9E75', borderRadius: 2, borderWidth: 0 }],
      },
      options: { animation: false, plugins: { legend: { display: false } }, scales: { x: scale, y: scale } },
    })

    conceptsChart.current = new Chart(conceptsRef.current.getContext('2d')!, {
      type: 'bar',
      data: {
        labels: ['Fundamentos', 'Condicionales', 'Bucles', 'Funciones'],
        datasets: [{ data: [5, 4, 4, 3], backgroundColor: ['#1D9E75', '#185FA5', '#BA7517', '#A32D2D'], borderRadius: 3, borderWidth: 0 }],
      },
      options: { animation: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: scale, y: scale } },
    })

    return () => { hourlyChart.current?.destroy(); conceptsChart.current?.destroy() }
  }, [data])

  if (!data) return <div style={{ padding: '1.25rem', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-secondary)' }}>Cargando…</div>

  const bouncePct = data.summary.sessions > 0 ? Math.round((data.summary.bounceSessions / data.summary.sessions) * 100) : 0
  const avgMin = Math.round(data.summary.avgSessionMs / 60_000)

  return (
    <div style={{ padding: '1.25rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>métricas</div>
        <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)' }}>Analítica</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8, marginBottom: '1rem' }}>
        {[
          { label: 'eventos totales', value: data.summary.totalEvents },
          { label: 'sesiones únicas', value: data.summary.sessions },
          { label: 'tasa de rebote', value: `${bouncePct}%` },
          { label: 'duración media', value: `${avgMin} min` },
        ].map((k) => (
          <div key={k.label} style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '0.875rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)' }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 8 }}>
        {sec(<>{sh('Actividad por hora del día (UTC)', 'hoy')}<div style={{ padding: '0.75rem' }}><canvas ref={hourlyRef} height={130}></canvas></div></>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        {sec(<>{sh('Retos por concepto')}<div style={{ padding: '0.75rem' }}><canvas ref={conceptsRef} height={140}></canvas></div></>)}
        {sec(<>
          {sh('Dónde se atascan')}
          {data.stuck.length === 0 && <div style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>Sin datos de progreso aún</div>}
          {data.stuck.sort((a, b) => b.current - a.current).slice(0, 5).map((s) => (
            <div key={s.challengeId} style={{ padding: '0.55rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-success)', flex: 1 }}>{s.challengeTitle}</span>
              <div style={{ width: 70, height: 3, background: 'var(--color-border-tertiary)', borderRadius: 99 }}>
                <div style={{ width: `${Math.min(100, s.current * 10)}%`, height: '100%', background: 'var(--color-text-danger)', borderRadius: 99 }} />
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', minWidth: 20, textAlign: 'right' }}>{s.current}</span>
            </div>
          ))}
        </>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {(['Dispositivos', 'Navegadores'] as const).map((title) => {
          const d = title === 'Dispositivos' ? data.devices : data.browsers
          return (
            <div key={title} style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
              {sh(title)}
              {Object.entries(d).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, count]) => (
                <div key={name} style={{ padding: '0.5rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--color-text-primary)' }}>{name || '—'}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>{count}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Go to `http://localhost:3000/admin/analytics`. Confirm:
- 4 KPI cards
- Bar chart (24 hourly buckets) renders
- Horizontal bar chart (4 concepts) renders
- Devices and browsers tables appear

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/(protected)/analytics/page.tsx"
git commit -m "feat(admin): redesign analytics page with Chart.js bar charts"
```

---

### Task 11: Sessions Page

**Files:**
- Create: `src/app/admin/(protected)/sessions/page.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/sessions` (Task 5)

- [ ] **Step 1: Create sessions page**

Create `src/app/admin/(protected)/sessions/page.tsx`:

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'

interface SessionStats { today: number; avgDurationMs: number; bounceRate: number }
interface SessionRow { sessionId: string; username: string; startedAt: number; durationMs: number; eventCount: number; device: string; browser: string }
interface SessionsData { summary: SessionStats; sessions: SessionRow[] }

function fmtDuration(ms: number) {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`
  return `${Math.round(ms / 60_000)} min`
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

function sec(children: React.ReactNode) {
  return <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>{children}</div>
}

function sh(title: string, sub?: string) {
  return (
    <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{title}</span>
      {sub && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)' }}>{sub}</span>}
    </div>
  )
}

const TH: React.CSSProperties = { padding: '0.5rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', textAlign: 'left', letterSpacing: '0.06em', borderBottom: '0.5px solid var(--color-border-tertiary)' }
const TD: React.CSSProperties = { padding: '0.5rem 1rem', fontSize: 12, borderBottom: '0.5px solid var(--color-border-tertiary)', whiteSpace: 'nowrap' }

export default function SessionsPage() {
  const [data, setData] = useState<SessionsData | null>(null)
  const durationRef = useRef<HTMLCanvasElement>(null)
  const durationChart = useRef<Chart | null>(null)

  useEffect(() => {
    fetch('/api/admin/sessions').then((r) => r.json()).then(setData)
  }, [])

  useEffect(() => {
    if (!data || !durationRef.current) return
    durationChart.current?.destroy()

    const style = getComputedStyle(document.documentElement)
    const grd = style.getPropertyValue('--color-border-tertiary').trim()
    const txt = style.getPropertyValue('--color-text-secondary').trim()
    const scale = { grid: { color: grd }, border: { display: false as const }, ticks: { color: txt, font: { family: 'monospace', size: 10 } } }

    const durations = data.sessions.slice(0, 20).map((s) => Math.round(s.durationMs / 1000))
    const labels = data.sessions.slice(0, 20).map((s) => s.username.slice(0, 8))

    durationChart.current = new Chart(durationRef.current.getContext('2d')!, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ data: durations, backgroundColor: '#185FA5', borderRadius: 2, borderWidth: 0 }],
      },
      options: { animation: false, plugins: { legend: { display: false } }, scales: { x: scale, y: { ...scale, title: { display: true, text: 'segundos', color: txt, font: { family: 'monospace', size: 10 } } } } },
    })

    return () => durationChart.current?.destroy()
  }, [data])

  if (!data) return <div style={{ padding: '1.25rem', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-secondary)' }}>Cargando…</div>

  return (
    <div style={{ padding: '1.25rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>sesiones</div>
        <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)' }}>Sesiones de hoy</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, marginBottom: '1rem' }}>
        {[
          { label: 'sesiones hoy', value: data.summary.today },
          { label: 'duración media', value: fmtDuration(data.summary.avgDurationMs) },
          { label: 'tasa de rebote', value: `${data.summary.bounceRate}%` },
        ].map((k) => (
          <div key={k.label} style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '0.875rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)' }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 8 }}>
        {sec(<>{sh('Duración por sesión (últimas 20)', 'segundos')}<div style={{ padding: '0.75rem' }}><canvas ref={durationRef} height={120}></canvas></div></>)}
      </div>

      {sec(<>
        {sh('Sesiones', `${data.sessions.length} hoy`)}
        {data.sessions.length === 0 && <div style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>Sin sesiones registradas hoy</div>}
        {data.sessions.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['ALUMNO', 'INICIO', 'DURACIÓN', 'EVENTOS', 'DISPOSITIVO', 'NAVEGADOR'].map((h) => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.sessions.map((s) => (
                <tr key={s.sessionId}>
                  <td style={{ ...TD, fontWeight: 500, color: 'var(--color-text-primary)' }}>{s.username}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>{fmtTime(s.startedAt)}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--color-text-info)' }}>{fmtDuration(s.durationMs)}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>{s.eventCount}</td>
                  <td style={{ ...TD, color: 'var(--color-text-secondary)' }}>{s.device || '—'}</td>
                  <td style={{ ...TD, color: 'var(--color-text-secondary)' }}>{s.browser || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </>)}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/admin/(protected)/sessions/page.tsx"
git commit -m "feat(admin): add sessions page with duration chart"
```

---

### Task 12: Users Page Redesign

**Files:**
- Modify: `src/app/admin/(protected)/users/page.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/users`, `POST /api/admin/users`, `PATCH /api/admin/users`

- [ ] **Step 1: Rewrite users page**

Replace `src/app/admin/(protected)/users/page.tsx` with:

```tsx
'use client'
import { useEffect, useState } from 'react'

interface UserRow { id: number; username: string; displayName: string; role: string; createdAt: number }

const TH: React.CSSProperties = { padding: '0.5rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', textAlign: 'left', letterSpacing: '0.06em', borderBottom: '0.5px solid var(--color-border-tertiary)' }
const TD: React.CSSProperties = { padding: '0.5rem 1rem', fontSize: 12, borderBottom: '0.5px solid var(--color-border-tertiary)' }

function roleBadge(role: string) {
  const color = role === 'root' ? 'var(--color-text-warning)' : role === 'admin' ? 'var(--color-text-info)' : 'var(--color-text-secondary)'
  const bg = role === 'root' ? 'var(--color-background-warning)' : role === 'admin' ? 'var(--color-background-info)' : 'var(--color-background-secondary)'
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color, background: bg, padding: '2px 6px', borderRadius: 99 }}>
      {role}
    </span>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ username: '', displayName: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const reload = () => fetch('/api/admin/users').then((r) => r.json()).then(setUsers)
  useEffect(() => { reload() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Error'); return }
    setForm({ username: '', displayName: '', password: '' }); setShowForm(false); reload()
  }

  async function changeRole(userId: number, role: string) {
    await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, role }) })
    reload()
  }

  const input: React.CSSProperties = { background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', padding: '0.4rem 0.6rem', fontSize: 12, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', outline: 'none', width: '100%' }

  return (
    <div style={{ padding: '1.25rem' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>gestión</div>
          <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)' }}>Alumnos y admins</div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: 'var(--color-background-success)', color: 'var(--color-text-success)', border: 'none', borderRadius: 'var(--border-radius-md)', padding: '0.4rem 0.875rem', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
          + nuevo admin
        </button>
      </div>

      {showForm && (
        <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>Crear admin</div>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 4 }}>USUARIO</div>
              <input style={input} value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="admin2" required />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 4 }}>NOMBRE</div>
              <input style={input} value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} placeholder="Nombre Admin" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 4 }}>CONTRASEÑA</div>
              <input style={input} type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
            </div>
            <button type="submit" disabled={loading} style={{ background: 'var(--color-background-success)', color: 'var(--color-text-success)', border: 'none', borderRadius: 'var(--border-radius-md)', padding: '0.4rem 0.875rem', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
              {loading ? '…' : 'Crear'}
            </button>
          </form>
          {error && <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-danger)' }}>{error}</div>}
        </div>
      )}

      <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Usuarios</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)' }}>{users.length} total</span>
        </div>
        {users.length === 0 && <div style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>Sin usuarios</div>}
        {users.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['USUARIO', 'NOMBRE', 'ROL', 'CAMBIAR ROL'].map((h) => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-primary)' }}>{u.username}</td>
                  <td style={{ ...TD, color: 'var(--color-text-secondary)' }}>{u.displayName || '—'}</td>
                  <td style={TD}>{roleBadge(u.role)}</td>
                  <td style={TD}>
                    {u.role !== 'root' && (
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value)}
                        style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', padding: '2px 6px', fontSize: 11, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', cursor: 'pointer' }}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Go to `http://localhost:3000/admin/users`. Confirm table renders users, "nuevo admin" button shows form, role select works.

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/(protected)/users/page.tsx"
git commit -m "feat(admin): redesign users page with create-admin form"
```

---

### Task 13: Appeals Page

**Files:**
- Create: `src/app/admin/(protected)/appeals/page.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/appeals`, `PATCH /api/admin/appeals` (Task 3)

- [ ] **Step 1: Create appeals page**

Create `src/app/admin/(protected)/appeals/page.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'

interface Appeal {
  id: number; userId: number; challengeId: number; language: string
  submittedCode: string; submittedOutput: string; message: string
  status: string; createdAt: number
}

function timeAgo(ms: number) {
  const m = Math.floor((Date.now() - ms) / 60_000)
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

export default function AppealsPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([])
  const [selected, setSelected] = useState<Appeal | null>(null)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)

  const reload = () => fetch('/api/admin/appeals').then((r) => r.json()).then(setAppeals)
  useEffect(() => { reload() }, [])

  async function resolve(status: 'accepted' | 'rejected') {
    if (!selected) return
    setLoading(true)
    await fetch('/api/admin/appeals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id, status, feedback }),
    })
    setLoading(false); setSelected(null); setFeedback(''); reload()
  }

  const btnBase: React.CSSProperties = { border: 'none', borderRadius: 'var(--border-radius-md)', padding: '0.4rem 0.875rem', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer' }

  return (
    <div style={{ padding: '1.25rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>revisión</div>
        <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)' }}>Apelaciones pendientes</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 8 }}>
        <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Pendientes</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-danger)' }}>{appeals.length} sin revisar</span>
          </div>
          {appeals.length === 0 && <div style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>No hay apelaciones pendientes</div>}
          {appeals.map((a) => (
            <div
              key={a.id}
              onClick={() => { setSelected(a); setFeedback('') }}
              style={{
                padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)',
                cursor: 'pointer', fontSize: 12,
                background: selected?.id === a.id ? 'var(--color-background-secondary)' : 'transparent',
                borderLeft: `2px solid ${selected?.id === a.id ? 'var(--color-text-info)' : 'transparent'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-success)' }}>reto #{a.challengeId}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)' }}>{timeAgo(a.createdAt)}</span>
              </div>
              <div style={{ color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.message || 'Sin mensaje'}</div>
            </div>
          ))}
        </div>

        {selected && (
          <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Revisar apelación #{selected.id}</span>
              <button onClick={() => setSelected(null)} style={{ ...btnBase, background: 'transparent', color: 'var(--color-text-secondary)', padding: '2px 6px' }}>✕</button>
            </div>

            <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', flex: 1, overflow: 'auto' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 4 }}>MENSAJE DEL ALUMNO</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>{selected.message || 'Sin mensaje'}</div>

              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 4 }}>CÓDIGO ENVIADO</div>
              <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '0.5rem', overflow: 'auto', maxHeight: 160, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>{selected.submittedCode}</pre>

              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 4 }}>OUTPUT</div>
              <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '0.5rem', overflow: 'auto', maxHeight: 80, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>{selected.submittedOutput || '(vacío)'}</pre>

              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 4 }}>FEEDBACK (opcional)</div>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                placeholder="Explicación para el alumno…"
                style={{ width: '100%', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', padding: '0.4rem 0.6rem', fontSize: 12, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ padding: '0.75rem 1rem', display: 'flex', gap: 8 }}>
              <button onClick={() => resolve('accepted')} disabled={loading} style={{ ...btnBase, background: 'var(--color-background-success)', color: 'var(--color-text-success)', flex: 1 }}>Aceptar</button>
              <button onClick={() => resolve('rejected')} disabled={loading} style={{ ...btnBase, background: 'var(--color-background-danger)', color: 'var(--color-text-danger)', flex: 1 }}>Rechazar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Go to `http://localhost:3000/admin/appeals`. Confirm empty state shows "No hay apelaciones pendientes". Test by creating an appeal from a student account and verifying it appears here with the correct UI to accept/reject.

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/(protected)/appeals/page.tsx"
git commit -m "feat(admin): add appeals review page with side panel"
```

---

### Task 14: Content Page

**Files:**
- Create: `src/app/admin/(protected)/content/page.tsx`

**Interfaces:**
- Consumes: `CurriculumRepository.listConceptsWithChallenges()` (existing) — server-side, no API needed

- [ ] **Step 1: Create content page (server component)**

Create `src/app/admin/(protected)/content/page.tsx`:

```tsx
import { getDb } from '@/lib/db/connection'
import { CurriculumRepository } from '@/lib/curriculum/repository'

export default async function ContentPage() {
  const db = getDb()
  const concepts = new CurriculumRepository(db).listConceptsWithChallenges()
  const totalChallenges = concepts.reduce((acc, c) => acc + c.challenges.length, 0)

  const TH: React.CSSProperties = { padding: '0.5rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', textAlign: 'left', letterSpacing: '0.06em', borderBottom: '0.5px solid var(--color-border-tertiary)' }
  const TD: React.CSSProperties = { padding: '0.5rem 1rem', fontSize: 12, borderBottom: '0.5px solid var(--color-border-tertiary)' }

  return (
    <div style={{ padding: '1.25rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>currículum</div>
        <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)' }}>Contenido</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, marginBottom: '1rem' }}>
        {[
          { label: 'conceptos', value: concepts.length },
          { label: 'retos totales', value: totalChallenges },
          { label: 'media por concepto', value: concepts.length ? Math.round(totalChallenges / concepts.length) : 0 },
        ].map((k) => (
          <div key={k.label} style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '0.875rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {concepts.map((concept) => (
        <div key={concept.id} style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-background-secondary)' }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{concept.name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginLeft: 8 }}>{concept.slug}</span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-success)' }}>{concept.challenges.length} retos</span>
          </div>

          {concept.challenges.length === 0 && (
            <div style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>Sin retos en este concepto</div>
          )}

          {concept.challenges.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['#', 'SLUG', 'TÍTULO'].map((h) => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {concept.challenges.map((ch) => (
                  <tr key={ch.id}>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)', width: 48 }}>{ch.ord}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-success)' }}>{ch.slug}</td>
                    <td style={{ ...TD, color: 'var(--color-text-primary)' }}>{ch.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Go to `http://localhost:3000/admin/content`. Confirm:
- KPI cards show correct concept/challenge counts
- One section per concept with its challenges listed

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/(protected)/content/page.tsx"
git commit -m "feat(admin): add content page with curriculum overview"
```

---

### Task 15: Audit Page

**Files:**
- Create: `src/app/admin/(protected)/audit/page.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/audit` (Task 6)

- [ ] **Step 1: Create audit page**

Create `src/app/admin/(protected)/audit/page.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'

interface AuditEntry { id: number; timestamp: number; adminUsername: string; type: string; meta: Record<string, unknown> }

function fmtTs(ms: number) {
  return new Date(ms).toLocaleString('es', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function typeLabel(type: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    'admin:user_create':     { label: 'nuevo admin',    color: 'var(--color-text-info)',    bg: 'var(--color-background-info)' },
    'admin:role_change':     { label: 'cambio de rol',  color: 'var(--color-text-warning)', bg: 'var(--color-background-warning)' },
    'admin:appeal_accept':   { label: 'apelación ✓',    color: 'var(--color-text-success)', bg: 'var(--color-background-success)' },
    'admin:appeal_reject':   { label: 'apelación ✗',    color: 'var(--color-text-danger)',  bg: 'var(--color-background-danger)' },
    'admin:maintenance_on':  { label: 'mantenimiento ↑', color: 'var(--color-text-warning)', bg: 'var(--color-background-warning)' },
    'admin:maintenance_off': { label: 'mantenimiento ↓', color: 'var(--color-text-success)', bg: 'var(--color-background-success)' },
  }
  const t = map[type] ?? { label: type, color: 'var(--color-text-secondary)', bg: 'var(--color-background-secondary)' }
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: t.color, background: t.bg, padding: '2px 6px', borderRadius: 99 }}>{t.label}</span>
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])

  useEffect(() => {
    fetch('/api/admin/audit').then((r) => r.json()).then(setEntries)
  }, [])

  const TH: React.CSSProperties = { padding: '0.5rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', textAlign: 'left', letterSpacing: '0.06em', borderBottom: '0.5px solid var(--color-border-tertiary)' }
  const TD: React.CSSProperties = { padding: '0.55rem 1rem', fontSize: 12, borderBottom: '0.5px solid var(--color-border-tertiary)' }

  return (
    <div style={{ padding: '1.25rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>trazabilidad</div>
        <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)' }}>Auditoría</div>
      </div>

      <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Acciones de administradores</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)' }}>últimas 100</span>
        </div>

        {entries.length === 0 && <div style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>Sin acciones registradas aún</div>}

        {entries.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['FECHA', 'ADMIN', 'ACCIÓN', 'DETALLE'].map((h) => <th key={h} style={TH}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)' }}>{fmtTs(e.timestamp)}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-primary)' }}>{e.adminUsername}</td>
                  <td style={TD}>{typeLabel(e.type)}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {Object.entries(e.meta).map(([k, v]) => `${k}: ${v}`).join(', ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/admin/(protected)/audit/page.tsx"
git commit -m "feat(admin): add audit log page"
```

---

### Task 16: Settings Page

**Files:**
- Create: `src/app/admin/(protected)/settings/page.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/settings`, `PATCH /api/admin/settings` (Task 7)

- [ ] **Step 1: Create settings page**

Create `src/app/admin/(protected)/settings/page.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'

interface AppealsConfig { maxPendingPerChallenge: number; maxPendingGlobal: number; cooldownHours: number }
interface Settings { maintenance: boolean; seedVersion: string; appeals: AppealsConfig }

function sec(children: React.ReactNode) {
  return <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', marginBottom: 8 }}>{children}</div>
}

function sh(title: string, sub?: string) {
  return (
    <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{title}</span>
      {sub && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)' }}>{sub}</span>}
    </div>
  )
}

function Row({ label, value, children }: { label: string; value?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      {value && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)' }}>{value}</span>}
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saving, setSaving] = useState(false)

  const reload = () => fetch('/api/admin/settings').then((r) => r.json()).then(setSettings)
  useEffect(() => { reload() }, [])

  async function toggleMaintenance() {
    if (!settings) return
    setSaving(true)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maintenance: !settings.maintenance }),
    })
    setSaving(false); reload()
  }

  if (!settings) return <div style={{ padding: '1.25rem', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-secondary)' }}>Cargando…</div>

  return (
    <div style={{ padding: '1.25rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>configuración</div>
        <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)' }}>Ajustes del sistema</div>
      </div>

      {sec(<>
        {sh('Sistema')}
        <Row label="Versión de seed" value={settings.seedVersion} />
        <Row label="Modo mantenimiento">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: settings.maintenance ? 'var(--color-text-warning)' : 'var(--color-text-secondary)',
            }}>
              {settings.maintenance ? '⚠ ACTIVO' : 'inactivo'}
            </span>
            <button
              onClick={toggleMaintenance}
              disabled={saving}
              style={{
                border: 'none', borderRadius: 'var(--border-radius-md)', padding: '0.3rem 0.75rem',
                fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer',
                background: settings.maintenance ? 'var(--color-background-success)' : 'var(--color-background-warning)',
                color: settings.maintenance ? 'var(--color-text-success)' : 'var(--color-text-warning)',
              }}
            >
              {saving ? '…' : settings.maintenance ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </Row>
      </>)}

      {sec(<>
        {sh('Apelaciones', 'sólo lectura')}
        <Row label="Máx. pendientes por reto" value={settings.appeals.maxPendingPerChallenge} />
        <Row label="Máx. pendientes global por alumno" value={settings.appeals.maxPendingGlobal} />
        <Row label="Cooldown tras rechazo (horas)" value={settings.appeals.cooldownHours} />
      </>)}

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 8 }}>
        Los ajustes de apelaciones se modifican en <code>src/lib/settings/defaults.ts</code>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Go to `http://localhost:3000/admin/settings`. Confirm:
- Seed version, maintenance toggle, and appeals config all show
- Clicking "Activar" maintenance sends PATCH and re-renders the toggle to "Desactivar"

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/(protected)/settings/page.tsx"
git commit -m "feat(admin): add settings page with maintenance toggle"
```

---

## Self-Review Checklist

### Spec coverage

| Section | Task |
|---------|------|
| Sidebar with 9 nav items + active teal border | Task 1 |
| Resumen with line + donut charts | Task 8 |
| En vivo with 10s refresh | Task 9 |
| Analítica with bar + horizontal-bar charts | Task 10 |
| Sesiones with per-session bar chart | Task 11 |
| Alumnos with create-admin form | Task 12 |
| Apelaciones with accept/reject | Task 13 |
| Contenido (curriculum overview) | Task 14 |
| Auditoría with typed badges | Task 15 |
| Ajustes with maintenance toggle | Task 16 |
| EventLogger query methods | Task 2 |
| Appeals resolution API | Task 3 |
| Live API | Task 4 |
| Sessions API | Task 5 |
| Audit API + logging | Task 6 |
| Settings API | Task 7 |
| Pending appeals badge in sidebar | Task 1 (AdminSidebar) |
| chart.js installed | Task 1 |

### Placeholder scan

- No "TBD", "TODO", or "implement later" in any step.
- All types referenced in later tasks are defined in the task that introduces them.

### Type consistency

- `Appeal.getById()` used in Task 3 — exists in `AppealRepository` (line 50 of repository.ts).
- `EventLogger.listRecent/listByTypes/listSessions` defined in Task 2, consumed in Tasks 4/5/6.
- `parseUserAgent` imported from `@/lib/analytics/user-agent` in Task 5 — already used in `analytics/route.ts`, so it exists.
- `SettingsRepository.getNumber()` used in Task 7 — confirmed exists in `settings/repository.ts`.
