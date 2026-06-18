# Perfiles estilo Discord — Banner, Insignias, Hexágono y Perfiles Públicos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the profile as a Discord-style layout: a custom banner (preset gradients + optional image upload), icon-only badges inline next to the username, a "sobre mí" block, stat chips, a per-concept skills hexagon (radar), and a "últimas lecciones" panel — for the user's own profile (`/profile`, editable) and public profiles of other students (`/u/[username]` + `GET /api/u/[username]`).

**Architecture:** A single shared builder `profileStats.ts` produces one `PublicProfile` DTO (badges, per-concept mastery, recent lessons) consumed by both the own-profile page and the public page/API. Banner is stored as a `banner` token (`preset:<id>` or `upload`) plus an optional base64 `banner_image` in SQLite — no external storage. Presentational components are shared between own and public views; only the own view renders the edit form. Warm app palette is kept (cream/violet/amber), only the layout changes.

**Tech Stack:** Next.js 16.2.9 (App Router; dynamic route `app/u/[username]`; route handler params are async — `await params`), React 19, better-sqlite3, chart.js 4.5 (installed), TypeScript.

## Global Constraints

- Keep the existing warm theme tokens from `globals.css` (`--violet`, `--amber`, `--green`, `--text`, `--card`, `--radius`). Do NOT use the admin `--adm-*` tokens here.
- Badges are ICON-ONLY (emoji), rendered inline immediately after `@username`, each with a `title` tooltip. No text labels beside the icon.
- Hexagon = Chart.js `radar`, one axis per curriculum concept, value = % of that concept's challenges completed (0–100). Works for any concept count.
- Banner image upload limit: reject anything not `data:image/(png|jpeg|webp|gif)` or larger than 500 KB. Presets are the default path.
- Public profiles expose only: username, displayName, avatar, banner, bannerImage, profileMessage, role, createdAt, lastSeen, totalStars, challengesDone, mastery, recentLessons, badges. NEVER expose password_hash, email, or precise internal ids beyond what's listed. Hidden users (`hidden = 1`, e.g. `root`) return 404 on the public page/API.
- Next dynamic params are async: `const { username } = await params`.
- No TypeScript `any` unless forced by better-sqlite3 `.get()/.all()` — use an explicit row interface and cast once.
- Avatar stays an emoji (unchanged). Only the banner is image-uploadable.

## File map

| File | Responsibility |
|------|----------------|
| `src/lib/db/schema.ts` (modify) | Idempotent `banner`, `banner_image` columns on `users` |
| `src/lib/users/types.ts` (modify) | `User.banner`, `User.bannerImage`; extend `ProfileUpdate` |
| `src/lib/users/banners.ts` (create) | `BANNER_PRESETS`, `bannerCss(token, image)` helper |
| `src/lib/users/repository.ts` (modify) | Map new columns; extend `updateProfile` |
| `src/lib/users/profile.ts` (modify) | Validate banner token + image |
| `src/lib/progress/repository.ts` (modify) | `recentCompleted(userId, limit)` |
| `src/lib/users/profileStats.ts` (create) | Badges, per-concept mastery, `buildProfile()` DTO |
| `src/app/api/me/route.ts` (modify) | Accept `banner`, `bannerImage` in PATCH |
| `src/app/api/u/[username]/route.ts` (create) | Public profile JSON |
| `src/components/profile/*` (create) | `ProfileLayout`, `ProfileHero`, `BadgeRow`, `Hexagon`, `RecentLessons` |
| `src/app/globals.css` (modify) | `.pf-*` profile styles |
| `src/app/profile/page.tsx` (modify) | Build DTO server-side, render own profile |
| `src/app/profile/ProfileView.tsx` (modify) | Use shared layout + edit (banner picker/upload) |
| `src/app/u/[username]/page.tsx` (create) | Public profile page |

---

### Task 1: Schema, User type, banner presets

**Files:**
- Modify: `src/lib/db/schema.ts`
- Modify: `src/lib/users/types.ts`
- Create: `src/lib/users/banners.ts`

**Interfaces:**
- Produces: `User.banner: string`, `User.bannerImage: string | null`; `BANNER_PRESETS: { id: string; label: string; css: string }[]`; `bannerCss(banner: string, bannerImage: string | null): string`.

- [ ] **Step 1: Add idempotent columns**

In `src/lib/db/schema.ts`, after the existing `chosen_language` migration `try/catch`, add:

```ts
  try { db.exec("ALTER TABLE users ADD COLUMN banner TEXT NOT NULL DEFAULT ''") } catch {
    // columna ya existe
  }
  try { db.exec("ALTER TABLE users ADD COLUMN banner_image TEXT") } catch {
    // columna ya existe
  }
```

- [ ] **Step 2: Extend User type + ProfileUpdate**

In `src/lib/users/types.ts`, add to `User`:

```ts
  banner: string
  bannerImage: string | null
```

and extend `ProfileUpdate`:

```ts
export interface ProfileUpdate {
  displayName: string
  avatar: string
  profileMessage: string
  banner: string
  bannerImage: string | null
}
```

- [ ] **Step 3: Create banner presets module**

Create `src/lib/users/banners.ts`:

```ts
export interface BannerPreset { id: string; label: string; css: string }

export const BANNER_PRESETS: BannerPreset[] = [
  { id: 'sunset', label: 'Atardecer', css: 'linear-gradient(120deg,#7c3aed,#a78bfa 40%,#fbbf24)' },
  { id: 'ocean', label: 'Océano', css: 'linear-gradient(120deg,#0ea5e9,#22d3ee)' },
  { id: 'forest', label: 'Bosque', css: 'linear-gradient(120deg,#059669,#34d399)' },
  { id: 'candy', label: 'Caramelo', css: 'linear-gradient(120deg,#ec4899,#f9a8d4)' },
  { id: 'fire', label: 'Fuego', css: 'linear-gradient(120deg,#ef4444,#fb923c)' },
  { id: 'night', label: 'Noche', css: 'linear-gradient(120deg,#312e81,#6d28d9)' },
  { id: 'mint', label: 'Menta', css: 'linear-gradient(120deg,#14b8a6,#a7f3d0)' },
  { id: 'gold', label: 'Oro', css: 'linear-gradient(120deg,#f59e0b,#fde68a)' },
]

const DEFAULT_CSS = BANNER_PRESETS[0].css

export function isPresetId(id: string): boolean {
  return BANNER_PRESETS.some((p) => p.id === id)
}

/** Returns a CSS background value for inline style. Image wins when banner === 'upload'. */
export function bannerCss(banner: string, bannerImage: string | null): string {
  if (banner === 'upload' && bannerImage) return `center / cover no-repeat url("${bannerImage}")`
  if (banner.startsWith('preset:')) {
    const id = banner.slice('preset:'.length)
    const p = BANNER_PRESETS.find((x) => x.id === id)
    if (p) return p.css
  }
  return DEFAULT_CSS
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | head -20
```

Expected: type errors only where `toUser`/`ProfileUpdate` consumers need the new fields (fixed in Task 2). The new file itself compiles.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema.ts src/lib/users/types.ts src/lib/users/banners.ts
git commit -m "feat(profile): add banner columns, User fields and banner presets"
```

---

### Task 2: Repository mapping, validation, recent lessons

**Files:**
- Modify: `src/lib/users/repository.ts`
- Modify: `src/lib/users/profile.ts`
- Modify: `src/lib/progress/repository.ts`

**Interfaces:**
- Consumes: `BANNER_PRESETS`, `isPreset` (Task 1).
- Produces: `UserRepository.updateProfile` now persists banner; `validateProfileUpdate` validates banner; `ProgressRepository.recentCompleted(userId, limit): { challengeId: number; stars: number; completedAt: number }[]`.

- [ ] **Step 1: Map new columns in repository**

In `src/lib/users/repository.ts`:

Add to `UserRow`:
```ts
  banner?: string
  banner_image?: string | null
```
Add to `toUser` return:
```ts
    banner: row.banner ?? '',
    bannerImage: row.banner_image ?? null,
```
Replace `updateProfile` with:
```ts
  updateProfile(id: number, update: ProfileUpdate): void {
    this.db
      .prepare(
        'UPDATE users SET display_name = ?, avatar = ?, profile_message = ?, banner = ?, banner_image = ? WHERE id = ?',
      )
      .run(update.displayName, update.avatar, update.profileMessage, update.banner, update.bannerImage, id)
  }
```

- [ ] **Step 2: Validate banner in profile.ts**

In `src/lib/users/profile.ts`, add import `import { isPresetId } from './banners'` and a constant + checks inside `validateProfileUpdate`, before the final `return { ok: true }`:

```ts
export const MAX_BANNER_IMAGE_CHARS = 700_000 // ~500 KB base64

// inside validateProfileUpdate, after profileMessage check:
  const banner = update.banner ?? ''
  const isPreset = banner.startsWith('preset:') && isPresetId(banner.slice('preset:'.length))
  if (banner !== '' && banner !== 'upload' && !isPreset) {
    return { ok: false, error: 'Banner no válido.' }
  }
  if (banner === 'upload') {
    const img = update.bannerImage ?? ''
    if (!/^data:image\/(png|jpe?g|webp|gif);base64,/.test(img)) {
      return { ok: false, error: 'La imagen del banner no es válida.' }
    }
    if (img.length > MAX_BANNER_IMAGE_CHARS) {
      return { ok: false, error: 'La imagen del banner es demasiado grande (máx. 500 KB).' }
    }
  }
```

- [ ] **Step 3: Update profile.test.ts fixtures**

`src/lib/users/profile.test.ts` builds `ProfileUpdate` objects — add `banner: '', bannerImage: null` to each fixture so they still type-check and pass. Add one new test:

```ts
  it('rechaza un banner preset desconocido', () => {
    const r = validateProfileUpdate({ displayName: 'x', avatar: '🦊', profileMessage: '', banner: 'preset:nope', bannerImage: null })
    expect(r.ok).toBe(false)
  })
```

- [ ] **Step 4: Add recentCompleted to ProgressRepository**

In `src/lib/progress/repository.ts`, add:

```ts
  recentCompleted(userId: number, limit: number): { challengeId: number; stars: number; completedAt: number }[] {
    const rows = this.db
      .prepare(
        `SELECT challenge_id, stars, completed_at FROM progress
         WHERE user_id = ? AND status = 'completed' AND completed_at IS NOT NULL
         ORDER BY completed_at DESC LIMIT ?`,
      )
      .all(userId, limit) as { challenge_id: number; stars: number; completed_at: number }[]
    return rows.map((r) => ({ challengeId: r.challenge_id, stars: r.stars, completedAt: r.completed_at }))
  }
```

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: all pass, including the new banner-validation test.

- [ ] **Step 6: Commit**

```bash
git add src/lib/users/repository.ts src/lib/users/profile.ts src/lib/users/profile.test.ts src/lib/progress/repository.ts
git commit -m "feat(profile): persist banner, validate it, add recentCompleted"
```

---

### Task 3: Profile stats builder (badges, mastery, DTO)

**Files:**
- Create: `src/lib/users/profileStats.ts`

**Interfaces:**
- Consumes: `UserRepository`, `CurriculumRepository`, `ProgressRepository`, `User`.
- Produces:
  - `interface Badge { id: string; icon: string; label: string }`
  - `interface MasteryAxis { concept: string; pct: number }`
  - `interface RecentLesson { slug: string; title: string; stars: number; completedAt: number }`
  - `interface PublicProfile { username, displayName, avatar, banner, bannerImage, profileMessage, role, createdAt, lastSeen, totalStars, challengesDone, mastery: MasteryAxis[], recentLessons: RecentLesson[], badges: Badge[] }`
  - `buildProfile(db: Database.Database, user: User): PublicProfile`

- [ ] **Step 1: Create the builder**

Create `src/lib/users/profileStats.ts`:

```ts
import type Database from 'better-sqlite3'
import type { User } from './types'
import { CurriculumRepository } from '../curriculum/repository'
import { ProgressRepository } from '../progress/repository'

export interface Badge { id: string; icon: string; label: string }
export interface MasteryAxis { concept: string; pct: number }
export interface RecentLesson { slug: string; title: string; stars: number; completedAt: number }

export interface PublicProfile {
  username: string
  displayName: string
  avatar: string
  banner: string
  bannerImage: string | null
  profileMessage: string
  role: User['role']
  createdAt: number
  lastSeen: number
  totalStars: number
  challengesDone: number
  mastery: MasteryAxis[]
  recentLessons: RecentLesson[]
  badges: Badge[]
}

const LANG_BADGE: Record<string, Badge> = {
  python: { id: 'lang-python', icon: '🐍', label: 'Python' },
  js: { id: 'lang-js', icon: '⚡', label: 'JavaScript' },
  blocks: { id: 'lang-blocks', icon: '🧩', label: 'Bloques' },
}

export function buildProfile(db: Database.Database, user: User): PublicProfile {
  const curriculum = new CurriculumRepository(db)
  const progress = new ProgressRepository(db)

  const concepts = curriculum.listConceptsWithChallenges()
  const challenges = curriculum.listChallenges()
  const titleBySlugId = new Map<number, { slug: string; title: string }>()
  for (const c of challenges) titleBySlugId.set(c.id, { slug: c.slug, title: c.title })

  const completed = new Set(progress.completedChallengeIds(user.id))

  let totalStars = 0
  let fullConcepts = 0
  const mastery: MasteryAxis[] = []
  for (const concept of concepts) {
    let doneInConcept = 0
    for (const ch of concept.challenges) {
      totalStars += progress.get(user.id, ch.id)?.stars ?? 0
      if (completed.has(ch.id)) doneInConcept++
    }
    const total = concept.challenges.length
    const pct = total > 0 ? Math.round((doneInConcept / total) * 100) : 0
    mastery.push({ concept: concept.name, pct })
    if (total > 0 && doneInConcept === total) fullConcepts++
  }

  const recentLessons: RecentLesson[] = progress.recentCompleted(user.id, 5).map((r) => {
    const meta = titleBySlugId.get(r.challengeId)
    return { slug: meta?.slug ?? String(r.challengeId), title: meta?.title ?? 'Reto', stars: r.stars, completedAt: r.completedAt }
  })

  const challengesDone = completed.size
  const allDone = challenges.length > 0 && challengesDone === challenges.length

  const badges: Badge[] = []
  if (user.role === 'root') badges.push({ id: 'root', icon: '👑', label: 'Root' })
  if (user.role === 'admin') badges.push({ id: 'admin', icon: '🛡️', label: 'Admin' })
  if (user.chosenLanguage && LANG_BADGE[user.chosenLanguage]) badges.push(LANG_BADGE[user.chosenLanguage])
  if (challengesDone >= 1) badges.push({ id: 'first', icon: '🚀', label: 'Primer reto' })
  if (totalStars >= 50) badges.push({ id: 'stars-50', icon: '💫', label: '50 estrellas' })
  else if (totalStars >= 25) badges.push({ id: 'stars-25', icon: '🌟', label: '25 estrellas' })
  else if (totalStars >= 10) badges.push({ id: 'stars-10', icon: '⭐', label: '10 estrellas' })
  if (fullConcepts >= 1) badges.push({ id: 'concept', icon: '🏅', label: `${fullConcepts} concepto(s) dominado(s)` })
  if (allDone) badges.push({ id: 'all', icon: '🏆', label: '¡Todo completado!' })

  return {
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    banner: user.banner,
    bannerImage: user.bannerImage,
    profileMessage: user.profileMessage,
    role: user.role,
    createdAt: user.createdAt,
    lastSeen: user.lastSeen,
    totalStars,
    challengesDone,
    mastery,
    recentLessons,
    badges,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/users/profileStats.ts
git commit -m "feat(profile): add profile DTO builder with badges and mastery"
```

---

### Task 4: APIs — extend PATCH /api/me, add public GET /api/u/[username]

**Files:**
- Modify: `src/app/api/me/route.ts`
- Create: `src/app/api/u/[username]/route.ts`

**Interfaces:**
- Consumes: `buildProfile` (Task 3), `validateProfileUpdate` (Task 2).
- Produces: `GET /api/u/:username` → `PublicProfile` (404 if not found or hidden).

- [ ] **Step 1: Extend PATCH /api/me**

In `src/app/api/me/route.ts`, replace the `update` object in `PATCH` with:

```ts
  const update = {
    displayName: String(body.displayName ?? ''),
    avatar: String(body.avatar ?? ''),
    profileMessage: String(body.profileMessage ?? ''),
    banner: String(body.banner ?? ''),
    bannerImage: body.bannerImage == null ? null : String(body.bannerImage),
  }
```

(The rest — `validateProfileUpdate(update)` then `repo.updateProfile(user.id, update)` — is unchanged and now persists the banner.)

- [ ] **Step 2: Create public profile API**

Create `src/app/api/u/[username]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { buildProfile } from '@/lib/users/profileStats'

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const db = getDb()
  const user = new UserRepository(db).findByUsername(username.trim().toLowerCase())
  if (!user || user.hidden) return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 404 })
  return NextResponse.json(buildProfile(db, user))
}
```

- [ ] **Step 3: Verify**

```bash
npm run dev
```
```bash
curl -s http://localhost:3000/api/u/root        # expect 404 (root is hidden)
curl -s http://localhost:3000/api/u/<alumno>    # expect PublicProfile JSON
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/me/route.ts" "src/app/api/u/[username]/route.ts"
git commit -m "feat(profile): persist banner via /api/me, add public /api/u/:username"
```

---

### Task 5: Shared profile components + CSS

**Files:**
- Create: `src/components/profile/ProfileHero.tsx`
- Create: `src/components/profile/BadgeRow.tsx`
- Create: `src/components/profile/Hexagon.tsx`
- Create: `src/components/profile/RecentLessons.tsx`
- Create: `src/components/profile/ProfileLayout.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `PublicProfile`, `Badge`, `MasteryAxis`, `RecentLesson` (Task 3); `bannerCss` (Task 1).
- Produces:
  - `BadgeRow({ badges }: { badges: Badge[] })`
  - `Hexagon({ mastery }: { mastery: MasteryAxis[] })` — `'use client'`, Chart.js radar
  - `RecentLessons({ lessons }: { lessons: RecentLesson[] })`
  - `ProfileHero({ profile, action }: { profile: PublicProfile; action?: ReactNode })` — banner + avatar + name + `@username` + BadgeRow + action slot
  - `ProfileLayout({ profile, action }: { profile: PublicProfile; action?: ReactNode })` — composes hero + sobre-mí + stat chips + Hexagon + RecentLessons

- [ ] **Step 1: Add profile CSS**

Append to `src/app/globals.css`:

```css
/* ── Perfil estilo Discord ─────────────────────────────────────── */
.pf-wrap { max-width: 560px; margin: 0 auto; }
.pf-card { background: var(--card); border: 3px solid var(--violet); border-radius: var(--radius); box-shadow: 0 5px 0 var(--violet-dark); overflow: hidden; }
.pf-banner { height: 108px; }
.pf-body { padding: 0 20px 20px; }
.pf-toprow { display: flex; justify-content: space-between; align-items: flex-end; margin-top: -46px; }
.pf-avatar { position: relative; width: 94px; height: 94px; border-radius: 50%; background: #fff; border: 4px solid var(--amber); box-shadow: 0 4px 0 var(--amber-dark); display: grid; place-items: center; font-size: 3rem; }
.pf-avatar__status { position: absolute; right: 4px; bottom: 4px; width: 18px; height: 18px; border-radius: 50%; background: var(--green); border: 3px solid #fff; }
.pf-name { font-size: 1.55rem; font-weight: 900; color: var(--text); line-height: 1.1; margin-top: 10px; }
.pf-subline { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 3px; }
.pf-handle { color: var(--text-dim); font-weight: 700; font-size: .95rem; }
.pf-badges { display: inline-flex; align-items: center; gap: 5px; padding-left: 6px; border-left: 2px solid #f0e6e6; }
.pf-badge { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-size: .8rem; background: #f3eefe; }
.pf-section { background: #faf7ff; border: 2px solid #f0e6e6; border-radius: 14px; padding: 12px 14px; margin-top: 14px; }
.pf-section__label { font-size: .72rem; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; color: var(--text-dim); margin-bottom: 5px; }
.pf-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
.pf-panel { background: #fff; border: 3px solid var(--violet); border-radius: 18px; box-shadow: 0 5px 0 var(--violet-dark); padding: 12px 14px; }
.pf-panel--amber { border-color: var(--amber); box-shadow: 0 5px 0 var(--amber-dark); }
.pf-lesson { display: flex; justify-content: space-between; align-items: center; }
.pf-lesson__title { font-weight: 800; color: var(--text); font-size: .9rem; }
.pf-lesson__time { font-size: .72rem; color: var(--text-dim); font-weight: 700; }
```

- [ ] **Step 2: BadgeRow**

Create `src/components/profile/BadgeRow.tsx`:

```tsx
import type { Badge } from '@/lib/users/profileStats'

export function BadgeRow({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) return null
  return (
    <span className="pf-badges">
      {badges.map((b) => (
        <span key={b.id} className="pf-badge" title={b.label} aria-label={b.label}>{b.icon}</span>
      ))}
    </span>
  )
}
```

- [ ] **Step 3: Hexagon**

Create `src/components/profile/Hexagon.tsx`:

```tsx
'use client'
import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import type { MasteryAxis } from '@/lib/users/profileStats'

export function Hexagon({ mastery }: { mastery: MasteryAxis[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const chart = useRef<Chart | null>(null)

  useEffect(() => {
    if (!ref.current || mastery.length === 0) return
    chart.current?.destroy()
    chart.current = new Chart(ref.current.getContext('2d')!, {
      type: 'radar',
      data: {
        labels: mastery.map((m) => m.concept),
        datasets: [{
          data: mastery.map((m) => m.pct),
          backgroundColor: 'rgba(124,58,237,.18)',
          borderColor: '#7c3aed',
          borderWidth: 2,
          pointBackgroundColor: '#fbbf24',
          pointRadius: 3,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { display: false } },
        scales: { r: { suggestedMin: 0, suggestedMax: 100,
          grid: { color: 'rgba(124,58,237,.15)' }, angleLines: { color: 'rgba(124,58,237,.15)' },
          pointLabels: { color: '#7c6f6f', font: { size: 10, weight: 'bold' } }, ticks: { display: false } } },
      },
    })
    return () => chart.current?.destroy()
  }, [mastery])

  if (mastery.length === 0) {
    return <p style={{ fontSize: '.85rem', color: 'var(--text-dim)', fontWeight: 600 }}>Sin datos todavía</p>
  }
  return <div style={{ position: 'relative', height: 178 }}><canvas ref={ref} role="img" aria-label="Maestría por concepto" /></div>
}
```

- [ ] **Step 4: RecentLessons**

Create `src/components/profile/RecentLessons.tsx`:

```tsx
import type { RecentLesson } from '@/lib/users/profileStats'

function timeAgo(ms: number): string {
  const m = Math.floor((Date.now() - ms) / 60000)
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ayer' : `hace ${d} días`
}

function stars(n: number): string {
  return '⭐'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n))
}

export function RecentLessons({ lessons }: { lessons: RecentLesson[] }) {
  if (lessons.length === 0) {
    return <p style={{ fontSize: '.85rem', color: 'var(--text-dim)', fontWeight: 600 }}>Aún no hay lecciones</p>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {lessons.map((l) => (
        <div key={l.slug} className="pf-lesson">
          <div>
            <div className="pf-lesson__title">{l.title}</div>
            <div className="pf-lesson__time">{timeAgo(l.completedAt)}</div>
          </div>
          <div style={{ fontSize: '.85rem' }}>{stars(l.stars)}</div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: ProfileHero**

Create `src/components/profile/ProfileHero.tsx`:

```tsx
import type { ReactNode } from 'react'
import type { PublicProfile } from '@/lib/users/profileStats'
import { bannerCss } from '@/lib/users/banners'
import { BadgeRow } from './BadgeRow'

export function ProfileHero({ profile, action }: { profile: PublicProfile; action?: ReactNode }) {
  return (
    <>
      <div className="pf-banner" style={{ background: bannerCss(profile.banner, profile.bannerImage) }} />
      <div className="pf-body">
        <div className="pf-toprow">
          <div className="pf-avatar">
            {profile.avatar || '🙂'}
            <span className="pf-avatar__status" />
          </div>
          {action && <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>{action}</div>}
        </div>
        <div className="pf-name">{profile.displayName}</div>
        <div className="pf-subline">
          <span className="pf-handle">@{profile.username}</span>
          <BadgeRow badges={profile.badges} />
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 6: ProfileLayout**

Create `src/components/profile/ProfileLayout.tsx`:

```tsx
import type { ReactNode } from 'react'
import type { PublicProfile } from '@/lib/users/profileStats'
import { ProfileHero } from './ProfileHero'
import { Hexagon } from './Hexagon'
import { RecentLessons } from './RecentLessons'

function memberSince(ms: number): string {
  return new Date(ms).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ProfileLayout({ profile, action }: { profile: PublicProfile; action?: ReactNode }) {
  return (
    <div className="pf-wrap">
      <div className="pf-card">
        <ProfileHero profile={profile} action={action} />
        <div className="pf-body" style={{ paddingTop: 0 }}>
          <div className="pf-section">
            <div className="pf-section__label">Sobre mí</div>
            <div style={{ color: 'var(--text)', fontWeight: 600 }}>{profile.profileMessage || 'Sin descripción todavía.'}</div>
            <div className="pf-section__label" style={{ marginTop: 9 }}>Miembro desde</div>
            <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '.9rem' }}>{memberSince(profile.createdAt)}</div>
          </div>

          <div className="pf-grid2">
            <div className="pf-panel" style={{ borderColor: 'var(--green)', boxShadow: '0 5px 0 var(--green-dark)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.7rem', fontWeight: 900, color: 'var(--green-dark)' }}>{profile.totalStars}</div>
              <div style={{ fontSize: '.8rem', fontWeight: 800, color: 'var(--text-dim)' }}>Estrellas</div>
            </div>
            <div className="pf-panel" style={{ borderColor: 'var(--green)', boxShadow: '0 5px 0 var(--green-dark)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.7rem', fontWeight: 900, color: 'var(--green-dark)' }}>{profile.challengesDone}</div>
              <div style={{ fontSize: '.8rem', fontWeight: 800, color: 'var(--text-dim)' }}>Retos hechos</div>
            </div>
          </div>

          <div className="pf-grid2">
            <div className="pf-panel">
              <div className="pf-section__label">Hexágono por concepto</div>
              <Hexagon mastery={profile.mastery} />
            </div>
            <div className="pf-panel pf-panel--amber">
              <div className="pf-section__label">Últimas lecciones</div>
              <RecentLessons lessons={profile.recentLessons} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/profile src/app/globals.css
git commit -m "feat(profile): add shared Discord-style profile components and CSS"
```

---

### Task 6: Own profile page with banner editing

**Files:**
- Modify: `src/app/profile/page.tsx`
- Modify: `src/app/profile/ProfileView.tsx`

**Interfaces:**
- Consumes: `buildProfile` (Task 3), `ProfileLayout` (Task 5), `BANNER_PRESETS` (Task 1).

- [ ] **Step 1: Build DTO server-side in page.tsx**

Replace `src/app/profile/page.tsx` with:

```tsx
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { buildProfile } from '@/lib/users/profileStats'
import { getCurrentUser } from '@/lib/session/server'
import { AppBar } from '@/components/AppBar'
import { ProfileView } from './ProfileView'

export default async function ProfilePage() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!user) redirect('/login')
  const profile = buildProfile(db, user)

  return (
    <main className="page">
      <AppBar avatar={user.avatar} displayName={user.displayName} />
      <ProfileView profile={profile} />
    </main>
  )
}
```

- [ ] **Step 2: Rewrite ProfileView with shared layout + banner edit**

Replace `src/app/profile/ProfileView.tsx` with a `'use client'` component that:
1. Holds editable state seeded from `profile` (displayName, avatar, profileMessage, banner, bannerImage).
2. Renders `<ProfileLayout profile={localProfile} action={<editButton/>} />` in view mode, where `localProfile` is `profile` merged with edited fields.
3. In edit mode renders a `.card` form with: Nombre, Avatar (emoji), Mensaje (max 100), a **banner picker** (grid of `BANNER_PRESETS` swatches — each a clickable div with `background: preset.css`; selecting sets `banner='preset:<id>'`, `bannerImage=null`), and an **"Subir imagen"** file input that reads the file via `FileReader.readAsDataURL`, rejects > 500 KB or non-image, and on success sets `banner='upload'` + `bannerImage=<dataURL>`.
4. Saves via `PATCH /api/me` with `{ displayName, avatar, profileMessage, banner, bannerImage }`; on success updates local state and exits edit mode.
5. Keeps the existing "🔄 Cambiar lenguaje (borra progreso)" button calling `DELETE /api/me/language` then redirect to `/onboarding`.

Full file:

```tsx
'use client'
import { useState } from 'react'
import { ProfileLayout } from '@/components/profile/ProfileLayout'
import { BANNER_PRESETS } from '@/lib/users/banners'
import type { PublicProfile } from '@/lib/users/profileStats'

export function ProfileView({ profile }: { profile: PublicProfile }) {
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [avatar, setAvatar] = useState(profile.avatar)
  const [profileMessage, setProfileMessage] = useState(profile.profileMessage)
  const [banner, setBanner] = useState(profile.banner || 'preset:sunset')
  const [bannerImage, setBannerImage] = useState<string | null>(profile.bannerImage)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [resetting, setResetting] = useState(false)

  const [d, setD] = useState({ displayName, avatar, profileMessage, banner, bannerImage })

  function openEdit() {
    setD({ displayName, avatar, profileMessage, banner, bannerImage })
    setError('')
    setEditing(true)
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!/^image\/(png|jpeg|jpg|webp|gif)$/.test(file.type)) { setError('Formato de imagen no válido.'); return }
    if (file.size > 500 * 1024) { setError('La imagen supera los 500 KB.'); return }
    const reader = new FileReader()
    reader.onload = () => setD((s) => ({ ...s, banner: 'upload', bannerImage: String(reader.result) }))
    reader.readAsDataURL(file)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/me', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'No se pudo guardar.'); return }
    setDisplayName(d.displayName); setAvatar(d.avatar); setProfileMessage(d.profileMessage)
    setBanner(d.banner); setBannerImage(d.bannerImage); setEditing(false)
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
            <label className="field__label">Mensaje <span className="char-count">({d.profileMessage.length}/100)</span></label>
            <textarea value={d.profileMessage} maxLength={100} onChange={(e) => setD((s) => ({ ...s, profileMessage: e.target.value }))} />
          </div>
          <div className="field">
            <label className="field__label">Banner</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {BANNER_PRESETS.map((p) => {
                const selected = d.banner === `preset:${p.id}`
                return (
                  <button type="button" key={p.id} onClick={() => setD((s) => ({ ...s, banner: `preset:${p.id}`, bannerImage: null }))}
                    title={p.label}
                    style={{ height: 36, borderRadius: 10, background: p.css, border: selected ? '3px solid var(--violet-dark)' : '2px solid #f0e6e6', boxShadow: 'none', cursor: 'pointer', padding: 0 }} />
                )
              })}
            </div>
            <label className="field__label" style={{ marginTop: 10 }}>O sube una imagen (máx. 500 KB)</label>
            <input type="file" accept="image/*" onChange={onPickFile} style={{ boxShadow: 'none' }} />
            {d.banner === 'upload' && d.bannerImage && (
              <div style={{ height: 60, marginTop: 8, borderRadius: 10, background: `center / cover no-repeat url("${d.bannerImage}")` }} />
            )}
          </div>
          <button type="submit">Guardar</button>{' '}
          <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>Cancelar</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    )
  }

  const local: PublicProfile = { ...profile, displayName, avatar, profileMessage, banner, bannerImage }

  return (
    <>
      <ProfileLayout
        profile={local}
        action={
          <button type="button" className="btn-secondary" onClick={openEdit} style={{ padding: '6px 14px', fontSize: '.85rem' }}>✏️ Editar perfil</button>
        }
      />
      <div className="pf-wrap">
        <button onClick={resetLanguage} disabled={resetting} className="btn btn-secondary" style={{ marginTop: '1.25rem', width: '100%' }}>
          {resetting ? 'Reiniciando…' : '🔄 Cambiar lenguaje (borra progreso)'}
        </button>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Run the app and verify**

```bash
npm run dev
```
Log in as a student, open `/profile`. Verify: banner shows, avatar overlaps, badges inline after `@username`, hexagon renders, últimas lecciones list. Edit → pick a preset, save → banner changes. Upload a small image → preview shows, save persists (reload keeps it).

- [ ] **Step 4: Commit**

```bash
git add "src/app/profile/page.tsx" "src/app/profile/ProfileView.tsx"
git commit -m "feat(profile): rebuild own profile with banner editing and Discord layout"
```

---

### Task 7: Public profile page `/u/[username]`

**Files:**
- Create: `src/app/u/[username]/page.tsx`

**Interfaces:**
- Consumes: `buildProfile` (Task 3), `ProfileLayout` (Task 5).

- [ ] **Step 1: Create the public page**

Create `src/app/u/[username]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { buildProfile } from '@/lib/users/profileStats'
import { ProfileLayout } from '@/components/profile/ProfileLayout'

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const db = getDb()
  const user = new UserRepository(db).findByUsername(username.trim().toLowerCase())
  if (!user || user.hidden) notFound()
  const profile = buildProfile(db, user)

  return (
    <main className="page" style={{ paddingTop: '1.5rem' }}>
      <ProfileLayout profile={profile} />
    </main>
  )
}
```

- [ ] **Step 2: Verify**

Open `/u/<alumno>` → public profile renders without edit button. `/u/root` → 404 page. `/u/<inexistente>` → 404.

- [ ] **Step 3: Run full suite + build**

```bash
npm test && npm run build 2>&1 | tail -20
```

Expected: tests pass; build succeeds.

- [ ] **Step 4: Commit**

```bash
git add "src/app/u/[username]/page.tsx"
git commit -m "feat(profile): add public profile page /u/:username"
```

---

## Self-Review Checklist

### Spec coverage

| Requirement | Task |
|---|---|
| Banner: presets + upload | 1 (presets), 2 (validate), 6 (UI) |
| Icon-only badges inline after @username | 3 (compute), 5 (BadgeRow/Hero) |
| Per-concept hexagon | 3 (mastery), 5 (Hexagon) |
| Últimas lecciones panel | 2 (recentCompleted), 3, 5 (RecentLessons) |
| Discord-style layout | 5 (ProfileLayout/Hero/CSS) |
| Public profiles + API | 4 (API), 7 (page) |
| Hidden users (root) excluded from public | 4, 7 |

### Placeholder scan
- No "TBD"/"TODO". Task 6 Step 2 ships the full file (no "similar to" references).

### Type consistency
- `PublicProfile` shape identical across `buildProfile` (Task 3), API (Task 4), components (Task 5), pages (Tasks 6–7).
- `ProfileUpdate` gains `banner`/`bannerImage` in Task 1; repository (Task 2), validation (Task 2), and PATCH (Task 4) all use the same 5 fields.
- `bannerCss(banner, bannerImage)` signature matches its caller in `ProfileHero` and the edit preview.

### Known scope notes
- Daily-streak badge is intentionally omitted (no per-day activity ledger); badges derive from role, language, stars, concept completion, and total completion.
- Banner images are stored as base64 in SQLite (≤500 KB) to avoid external storage; if many large banners become a concern, migrate to file/object storage later.
- "Online" status dot is cosmetic (always green) for now; wiring it to `lastSeen` recency is a small follow-up.
