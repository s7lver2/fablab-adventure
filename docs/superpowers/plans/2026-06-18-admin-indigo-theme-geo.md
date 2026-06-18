# Admin Panel — Indigo Theme + Light/Dark Toggle + Geolocation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the entire admin panel into a dark/light "data dashboard" aesthetic (near-black or off-white surfaces, indigo `#6366F1` accent, serif-italic section titles, monospace labels), add a working theme toggle in the sidebar, and add geolocation throughout (Top países card, located sessions, a dedicated Geografía page) with demo data plus a prepared backend seam.

**Architecture:** A self-contained admin token system lives in `globals.css`, scoped under `.admin-shell` with `[data-theme="light"]` overrides — independent of the app's existing `--text`/`--violet` variables. A no-flash inline script + a `ThemeToggle` client component flip `data-theme` and persist to `localStorage`. Shared presentational primitives in `adminUi.tsx` (Card, PageTitle, SectionLabel, Kpi, chart theme helper) are consumed by every page so each page is thin. Geolocation: idempotent `country`/`city` columns on `events`, IP capture in `EventLogger`, a `geo.ts` lookup seam returning demo data, a `/api/admin/geo` route, and a `Geografía` page.

**Tech Stack:** Next.js 16.2.9 (App Router, route group `(protected)`), React 19, better-sqlite3, chart.js 4.5 (already installed), TypeScript.

## Global Constraints

- Indigo accent is exactly `#6366F1` (dark accent-2 `#818CF8`, light accent-2 `#4F46E5`). Never reintroduce crimson/red except `--adm-danger`.
- All admin styling reads the `--adm-*` tokens defined in Task 1. NEVER use `var(--color-text-*)`, `var(--color-background-*)`, `var(--font-mono)` — those do not exist in this project and must be removed wherever found in admin pages.
- Section titles use `fontFamily: 'var(--adm-font-display)'`, `fontStyle: 'italic'`, lowercase text (e.g. `resumen`, `geografía`).
- Labels, stats, slugs, counts, timestamps use `fontFamily: 'var(--adm-font-mono)'`.
- Theme default is dark. Persist user choice in `localStorage` key `adm-theme` (`'dark'` | `'light'`).
- Chart.js canvases cannot read CSS variables — pass hex from the `chartTheme()` helper; re-init charts on the `adm-theme-change` window event.
- Admin auth unchanged: `isAdmin(user)` from `@/lib/auth/guard`, session via `getCurrentUser` from `@/lib/session/server`.
- API errors: `NextResponse.json({ error: '...' }, { status: N })`.
- No TypeScript `any` unless forced by better-sqlite3 typed `.get()/.all()` results — then use an explicit row interface and cast once.
- Geolocation data is demo/default for now. Real geo-IP lookup is a clearly-marked TODO seam; do NOT add a network geo-IP call.
- Country flags use emoji (e.g. `🇪🇸`) — this is data, intentional, and matches the approved mockup.

## File map

| File | Responsibility |
|------|----------------|
| `src/app/globals.css` (modify) | Append `.admin-shell` token blocks (dark default + light) |
| `src/app/admin/(protected)/components/ThemeToggle.tsx` (create) | Client toggle: flips `data-theme`, persists, dispatches event |
| `src/app/admin/(protected)/components/adminUi.tsx` (create) | Shared primitives + `chartTheme()` |
| `src/app/admin/(protected)/components/AdminSidebar.tsx` (modify) | Re-skin, add Geografía item, embed ThemeToggle |
| `src/app/admin/(protected)/layout.tsx` (modify) | `.admin-shell` wrapper + no-flash script |
| `src/app/admin/(protected)/page.tsx` (modify) | Overview re-skin + Top países + located sessions |
| `src/app/admin/(protected)/live/page.tsx` (modify) | Re-skin |
| `src/app/admin/(protected)/analytics/page.tsx` (modify) | Re-skin |
| `src/app/admin/(protected)/sessions/page.tsx` (modify) | Re-skin + located sessions |
| `src/app/admin/(protected)/users/page.tsx` (modify) | Re-skin |
| `src/app/admin/(protected)/appeals/page.tsx` (modify) | Re-skin |
| `src/app/admin/(protected)/content/page.tsx` (modify) | Re-skin |
| `src/app/admin/(protected)/audit/page.tsx` (modify) | Re-skin |
| `src/app/admin/(protected)/settings/page.tsx` (modify) | Re-skin |
| `src/lib/analytics/geo.ts` (create) | Demo geo lookup seam + types |
| `src/lib/db/schema.ts` (modify) | Idempotent `country`/`city` columns on `events` |
| `src/lib/analytics/events.ts` (modify) | Persist + return `country`/`city`; geo aggregation methods |
| `src/app/api/admin/geo/route.ts` (create) | Top países / ciudades / map series |
| `src/app/admin/(protected)/geo/page.tsx` (create) | Geografía page |

---

### Task 1: Admin theme token system

**Files:**
- Modify: `src/app/globals.css` (append at end)

**Interfaces:**
- Produces: CSS class `.admin-shell` (dark default) and `.admin-shell[data-theme="light"]` exposing all `--adm-*` tokens listed below.

- [ ] **Step 1: Append admin token blocks to globals.css**

Append to the END of `src/app/globals.css`:

```css
/* ──────────────────────────────────────────────────────────────
   Admin panel theme tokens (scoped). Dark is the default.
   ────────────────────────────────────────────────────────────── */
.admin-shell {
  --adm-bg: #0e0b16;
  --adm-side: #0a0712;
  --adm-panel: rgba(255, 255, 255, 0.025);
  --adm-panel-2: rgba(255, 255, 255, 0.045);
  --adm-border: rgba(255, 255, 255, 0.07);
  --adm-text: #ece9f5;
  --adm-muted: #8b85a6;
  --adm-label: #6f6890;
  --adm-accent: #6366f1;
  --adm-accent-2: #818cf8;
  --adm-soft: rgba(99, 102, 241, 0.13);
  --adm-track: rgba(255, 255, 255, 0.08);
  --adm-success: #3ddc84;
  --adm-danger: #f87171;
  --adm-grid: rgba(255, 255, 255, 0.07);
  --adm-tick: #8b85a6;
  --adm-font-display: Georgia, "Times New Roman", serif;
  --adm-font-mono: ui-monospace, "Cascadia Code", "Fira Code", "Courier New", monospace;
  --adm-radius: 10px;

  background: var(--adm-bg);
  color: var(--adm-text);
  min-height: 100vh;
}

.admin-shell[data-theme="light"] {
  --adm-bg: #faf9ff;
  --adm-side: #ffffff;
  --adm-panel: #ffffff;
  --adm-panel-2: #f5f4fc;
  --adm-border: rgba(20, 16, 40, 0.10);
  --adm-text: #1e1b2e;
  --adm-muted: #6b6685;
  --adm-label: #8b86a3;
  --adm-accent: #6366f1;
  --adm-accent-2: #4f46e5;
  --adm-soft: rgba(99, 102, 241, 0.10);
  --adm-track: rgba(20, 16, 40, 0.08);
  --adm-success: #16a34a;
  --adm-danger: #dc2626;
  --adm-grid: rgba(20, 16, 40, 0.08);
  --adm-tick: #8b86a3;
}

.admin-shell a { color: var(--adm-accent-2); font-weight: 500; }
.admin-shell input,
.admin-shell textarea,
.admin-shell select {
  background: var(--adm-panel-2);
  color: var(--adm-text);
  border: 0.5px solid var(--adm-border);
  border-radius: var(--adm-radius);
  font-family: var(--adm-font-mono);
  box-shadow: none;
}
.admin-shell input:focus,
.admin-shell textarea:focus,
.admin-shell select:focus {
  outline: none;
  border-color: var(--adm-accent);
  box-shadow: 0 0 0 3px var(--adm-soft);
}
.admin-shell button { box-shadow: none; }
```

- [ ] **Step 2: Verify it compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: build proceeds past CSS without errors (it may fail later on unrelated pages — only the CSS parse matters here).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(admin): add scoped indigo dark/light theme tokens"
```

---

### Task 2: ThemeToggle component

**Files:**
- Create: `src/app/admin/(protected)/components/ThemeToggle.tsx`

**Interfaces:**
- Consumes: the `.admin-shell` element with `id="admin-shell"` (set in Task 5 layout).
- Produces: `<ThemeToggle />` — a button that reads `#admin-shell` `data-theme`, flips it, writes `localStorage['adm-theme']`, and dispatches `window` event `adm-theme-change`.

- [ ] **Step 1: Create the component**

Create `src/app/admin/(protected)/components/ThemeToggle.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const shell = document.getElementById('admin-shell')
    const current = (shell?.getAttribute('data-theme') as 'dark' | 'light') ?? 'dark'
    setTheme(current)
  }, [])

  function toggle() {
    const shell = document.getElementById('admin-shell')
    if (!shell) return
    const next = theme === 'dark' ? 'light' : 'dark'
    shell.setAttribute('data-theme', next)
    try { localStorage.setItem('adm-theme', next) } catch {}
    setTheme(next)
    window.dispatchEvent(new Event('adm-theme-change'))
  }

  const isDark = theme === 'dark'
  return (
    <button
      onClick={toggle}
      aria-label="Cambiar tema"
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        background: 'var(--adm-panel-2)', border: '0.5px solid var(--adm-border)',
        borderRadius: 'var(--adm-radius)', padding: '7px', cursor: 'pointer',
        fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-text)', marginBottom: 10,
      }}
    >
      <span style={{ fontFamily: 'var(--adm-font-mono)' }}>{isDark ? '☀' : '☾'}</span>
      {isDark ? 'Tema claro' : 'Tema oscuro'}
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/admin/(protected)/components/ThemeToggle.tsx"
git commit -m "feat(admin): add theme toggle component"
```

---

### Task 3: Shared admin UI primitives

**Files:**
- Create: `src/app/admin/(protected)/components/adminUi.tsx`

**Interfaces:**
- Produces (all consumed by later page tasks):
  - `Card({ children, style }): JSX` — panel surface (bg `--adm-panel`, 0.5px `--adm-border`, radius, padding 14px 16px)
  - `SectionLabel({ children, style }): JSX` — mono uppercase label, color `--adm-label`, letter-spacing .13em, 11px
  - `PageTitle({ title, sub, live }): JSX` — serif-italic lowercase title (29px), optional green LIVE pill, optional mono sub line
  - `Kpi({ label, value, sub, accent }): JSX` — KPI card; `accent` tints bg `--adm-soft` and value `--adm-accent-2`
  - `chartTheme(): { grid: string; tick: string }` — reads computed `--adm-grid` / `--adm-tick` from `#admin-shell`
  - `ACCENT = '#6366f1'`, `ACCENT_2 = '#818cf8'`, `ACCENT_SOFT = '#a5a8f5'`, `ACCENT_DEEP = '#3b3a6b'` — chart hexes (fixed; legible both themes)

- [ ] **Step 1: Create the primitives module**

Create `src/app/admin/(protected)/components/adminUi.tsx`:

```tsx
'use client'
import type { CSSProperties, ReactNode } from 'react'

export const ACCENT = '#6366f1'
export const ACCENT_2 = '#818cf8'
export const ACCENT_SOFT = '#a5a8f5'
export const ACCENT_DEEP = '#3b3a6b'

export function chartTheme(): { grid: string; tick: string } {
  if (typeof window === 'undefined') return { grid: 'rgba(255,255,255,.07)', tick: '#8b85a6' }
  const shell = document.getElementById('admin-shell') ?? document.documentElement
  const s = getComputedStyle(shell)
  return {
    grid: s.getPropertyValue('--adm-grid').trim() || 'rgba(255,255,255,.07)',
    tick: s.getPropertyValue('--adm-tick').trim() || '#8b85a6',
  }
}

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      background: 'var(--adm-panel)', border: '0.5px solid var(--adm-border)',
      borderRadius: 'var(--adm-radius)', padding: '14px 16px', ...style,
    }}>
      {children}
    </div>
  )
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      fontFamily: 'var(--adm-font-mono)', fontSize: 11, letterSpacing: '.13em',
      color: 'var(--adm-label)', textTransform: 'uppercase', ...style,
    }}>
      {children}
    </div>
  )
}

export function PageTitle({ title, sub, live }: { title: string; sub?: string; live?: boolean }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 11 }}>
        <span style={{ fontFamily: 'var(--adm-font-display)', fontStyle: 'italic', fontSize: 29, color: 'var(--adm-text)' }}>{title}</span>
        {live && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--adm-font-mono)', fontSize: 11, letterSpacing: '.1em', color: 'var(--adm-success)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--adm-success)', display: 'inline-block' }} />LIVE
          </span>
        )}
      </div>
      {sub && <SectionLabel style={{ marginTop: 2 }}>{sub}</SectionLabel>}
    </div>
  )
}

export function Kpi({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: string; accent?: boolean }) {
  return (
    <div style={{
      background: accent ? 'var(--adm-soft)' : 'var(--adm-panel)',
      border: accent ? '0.5px solid transparent' : '0.5px solid var(--adm-border)',
      borderRadius: 'var(--adm-radius)', padding: '13px 15px',
    }}>
      <SectionLabel>{label}</SectionLabel>
      <div style={{ fontFamily: 'var(--adm-font-display)', fontStyle: 'italic', fontSize: 25, marginTop: 3, color: accent ? 'var(--adm-accent-2)' : 'var(--adm-text)' }}>{value}</div>
      {sub && <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: accent ? 'var(--adm-accent-2)' : 'var(--adm-muted)' }}>{sub}</div>}
    </div>
  )
}

export const tableHeadStyle: CSSProperties = { padding: '7px 12px', fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)', textAlign: 'left', letterSpacing: '.08em', borderBottom: '0.5px solid var(--adm-border)' }
export const tableCellStyle: CSSProperties = { padding: '7px 12px', fontSize: 12, color: 'var(--adm-text)', borderBottom: '0.5px solid var(--adm-border)' }
export const monoCellStyle: CSSProperties = { ...tableCellStyle, fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-muted)' }
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/admin/(protected)/components/adminUi.tsx"
git commit -m "feat(admin): add shared themed UI primitives"
```

---

### Task 4: Re-skin AdminSidebar + add Geografía + theme toggle

**Files:**
- Modify: `src/app/admin/(protected)/components/AdminSidebar.tsx`

**Interfaces:**
- Consumes: `ThemeToggle` (Task 2).
- Produces: `<AdminSidebar username role pendingAppeals />` unchanged signature; now includes a `/admin/geo` nav item and the theme toggle in the footer.

- [ ] **Step 1: Replace AdminSidebar.tsx**

Replace the whole file with:

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from './ThemeToggle'

interface Props { username: string; role: string; pendingAppeals: number }

const NAV_GROUPS = [
  [
    { href: '/admin', label: 'Resumen', icon: '▦' },
    { href: '/admin/live', label: 'En vivo', icon: '◉' },
    { href: '/admin/analytics', label: 'Analítica', icon: '↗' },
    { href: '/admin/sessions', label: 'Sesiones', icon: '◷' },
    { href: '/admin/geo', label: 'Geografía', icon: '◍' },
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
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href))

  return (
    <div style={{
      width: 172, minWidth: 172, background: 'var(--adm-side)',
      borderRight: '0.5px solid var(--adm-border)', display: 'flex', flexDirection: 'column', minHeight: '100vh',
    }}>
      <div style={{ padding: '14px', borderBottom: '0.5px solid var(--adm-border)' }}>
        <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 11, letterSpacing: '.13em', color: 'var(--adm-accent-2)' }}>FAB LAB QUEST</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--adm-text)', marginTop: 2 }}>Panel admin</div>
      </div>

      <nav style={{ padding: '8px 0', flex: 1 }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && <div style={{ height: '0.5px', background: 'var(--adm-border)', margin: '6px 14px' }} />}
            {group.map((item) => {
              const active = isActive(item.href)
              return (
                <Link key={item.href} href={item.href} style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '6px 14px', fontSize: 12, textDecoration: 'none',
                  color: active ? 'var(--adm-text)' : 'var(--adm-muted)',
                  borderLeft: `2px solid ${active ? 'var(--adm-accent)' : 'transparent'}`,
                  background: active ? 'var(--adm-soft)' : 'transparent',
                }}>
                  <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 13 }}>{item.icon}</span>
                  {item.label}
                  {item.href === '/admin/appeals' && pendingAppeals > 0 && (
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--adm-font-mono)', fontSize: 10, background: 'var(--adm-soft)', color: 'var(--adm-accent-2)', padding: '1px 6px', borderRadius: 99 }}>{pendingAppeals}</span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: '10px 14px', borderTop: '0.5px solid var(--adm-border)' }}>
        <ThemeToggle />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--adm-font-mono)', fontSize: 10, background: 'var(--adm-soft)', color: 'var(--adm-accent-2)', flexShrink: 0 }}>{username.slice(0, 2).toUpperCase()}</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--adm-text)' }}>{username}</div>
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-accent-2)' }}>★ {role}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/admin/(protected)/components/AdminSidebar.tsx"
git commit -m "feat(admin): re-skin sidebar, add Geografía nav and theme toggle"
```

---

### Task 5: Re-skin layout with theme shell + no-flash script

**Files:**
- Modify: `src/app/admin/(protected)/layout.tsx`

**Interfaces:**
- Consumes: `AdminSidebar` (Task 4), `.admin-shell` tokens (Task 1).
- Produces: every admin page rendered inside `<div id="admin-shell" className="admin-shell" data-theme="dark">`.

- [ ] **Step 1: Replace layout.tsx**

```tsx
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { AppealRepository } from '@/lib/appeals/repository'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'
import { AdminSidebar } from './components/AdminSidebar'

const NO_FLASH = `(function(){try{var t=localStorage.getItem('adm-theme')||'dark';var el=document.getElementById('admin-shell');if(el)el.setAttribute('data-theme',t);}catch(e){}})();`

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!isAdmin(user)) redirect('/admin/login')

  const pendingAppeals = new AppealRepository(db).listPending().length

  return (
    <div id="admin-shell" className="admin-shell" data-theme="dark">
      <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <AdminSidebar username={user.username} role={user.role} pendingAppeals={pendingAppeals} />
        <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run the app and verify the shell**

```bash
npm run dev
```

Log in as `root` / `changeme`, open `/admin`. Expected: dark indigo shell, sidebar styled, theme toggle flips between dark and light and persists across reload.

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/(protected)/layout.tsx"
git commit -m "feat(admin): wrap admin in themed shell with no-flash script"
```

---

### Task 6: Geolocation backend (schema + logger + demo lookup)

**Files:**
- Create: `src/lib/analytics/geo.ts`
- Modify: `src/lib/db/schema.ts`
- Modify: `src/lib/analytics/events.ts`

**Interfaces:**
- Produces:
  - `geo.ts`: `interface GeoInfo { country: string; countryCode: string; city: string }`, `lookupGeo(ip: string | null): GeoInfo` (demo: deterministic pick from a fixed table; real lookup is a TODO), `DEMO_COUNTRIES: { code: string; name: string; flag: string; count: number }[]`, `DEMO_CITIES: { city: string; country: string; flag: string; count: number }[]`, `flagFor(code: string): string`
  - `events.ts`: `EventInput` gains optional `ip?: string | null`; `EventRecord` gains `country: string`, `city: string`; new `EventLogger.topCountries(windowMs): { code: string; name: string; flag: string; count: number }[]` and `EventLogger.topCities(windowMs): { city: string; country: string; flag: string; count: number }[]` — both fall back to demo data when the table has no geo rows.

- [ ] **Step 1: Create geo.ts demo seam**

Create `src/lib/analytics/geo.ts`:

```ts
export interface GeoInfo { country: string; countryCode: string; city: string }

const FLAGS: Record<string, string> = {
  ES: '🇪🇸', MX: '🇲🇽', AR: '🇦🇷', PT: '🇵🇹', CO: '🇨🇴', CL: '🇨🇱', PE: '🇵🇪', US: '🇺🇸', '??': '🏳️',
}

export function flagFor(code: string): string {
  return FLAGS[code] ?? '🏳️'
}

const DEMO_TABLE: { country: string; countryCode: string; city: string }[] = [
  { country: 'España', countryCode: 'ES', city: 'Madrid' },
  { country: 'España', countryCode: 'ES', city: 'Barcelona' },
  { country: 'México', countryCode: 'MX', city: 'Guadalajara' },
  { country: 'Argentina', countryCode: 'AR', city: 'Córdoba' },
  { country: 'Portugal', countryCode: 'PT', city: 'Lisboa' },
  { country: 'Colombia', countryCode: 'CO', city: 'Bogotá' },
]

// TODO(geo-ip): replace this demo with a real geo-IP lookup (e.g. MaxMind GeoLite2
// or an external API). The `ip` argument is already captured by EventLogger.
export function lookupGeo(ip: string | null): GeoInfo {
  if (!ip) return { country: 'Desconocido', countryCode: '??', city: 'Desconocida' }
  let h = 0
  for (let i = 0; i < ip.length; i++) h = (h * 31 + ip.charCodeAt(i)) >>> 0
  return DEMO_TABLE[h % DEMO_TABLE.length]
}

export const DEMO_COUNTRIES = [
  { code: 'ES', name: 'España', flag: '🇪🇸', count: 31 },
  { code: 'MX', name: 'México', flag: '🇲🇽', count: 7 },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', count: 5 },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', count: 3 },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', count: 2 },
]

export const DEMO_CITIES = [
  { city: 'Madrid', country: 'España', flag: '🇪🇸', count: 18 },
  { city: 'Barcelona', country: 'España', flag: '🇪🇸', count: 9 },
  { city: 'Guadalajara', country: 'México', flag: '🇲🇽', count: 5 },
  { city: 'Córdoba', country: 'Argentina', flag: '🇦🇷', count: 4 },
  { city: 'Lisboa', country: 'Portugal', flag: '🇵🇹', count: 3 },
]
```

- [ ] **Step 2: Add idempotent columns to schema.ts**

In `src/lib/db/schema.ts`, find the existing idempotent migration block (the `try { db.exec("ALTER TABLE users ADD COLUMN chosen_language TEXT") } catch {}`). Add directly after it:

```ts
  try { db.exec("ALTER TABLE events ADD COLUMN country TEXT NOT NULL DEFAULT ''") } catch {
    // columna ya existe
  }
  try { db.exec("ALTER TABLE events ADD COLUMN city TEXT NOT NULL DEFAULT ''") } catch {
    // columna ya existe
  }
```

- [ ] **Step 3: Update EventLogger to persist + aggregate geo**

In `src/lib/analytics/events.ts`:

Add to `EventInput`: `ip?: string | null` and `country?: string`, `city?: string`.
Add to `EventRecord`: `country: string`, `city: string`.
Add to `RawRow`: `country: string`, `city: string` (better-sqlite3 returns them now).
In `toRecord`, map `country: r.country ?? '', city: r.city ?? ''`.
In `log()`, derive geo when not supplied: `import { lookupGeo } from './geo'`; compute `const g = e.country != null ? { country: e.country, city: e.city ?? '' } : lookupGeo(e.ip ?? null)` and store `g.country`, `g.city`. Update the INSERT to include `country, city` columns and two more `?` placeholders.

Append two aggregation methods to the class:

```ts
  topCountries(windowMs: number) {
    const since = Date.now() - windowMs
    const rows = this.db.prepare(
      `SELECT country, COUNT(DISTINCT session_id) AS n FROM events
       WHERE created_at >= ? AND country != '' AND country != 'Desconocido'
       GROUP BY country ORDER BY n DESC LIMIT 8`,
    ).all(since) as { country: string; n: number }[]
    if (rows.length === 0) return DEMO_COUNTRIES
    return rows.map((r) => ({ code: '??', name: r.country, flag: '🏳️', count: r.n }))
  }

  topCities(windowMs: number) {
    const since = Date.now() - windowMs
    const rows = this.db.prepare(
      `SELECT city, country, COUNT(DISTINCT session_id) AS n FROM events
       WHERE created_at >= ? AND city != '' AND city != 'Desconocida'
       GROUP BY city, country ORDER BY n DESC LIMIT 12`,
    ).all(since) as { city: string; country: string; n: number }[]
    if (rows.length === 0) return DEMO_CITIES
    return rows.map((r) => ({ city: r.city, country: r.country, flag: '🏳️', count: r.n }))
  }
```

Add the import at the top: `import { lookupGeo, DEMO_COUNTRIES, DEMO_CITIES } from './geo'`.

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all existing tests still pass (the `log()` signature only gained optional fields; `EventRecord` consumers tolerate extra fields).

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics/geo.ts src/lib/db/schema.ts src/lib/analytics/events.ts
git commit -m "feat(geo): capture country/city on events with demo lookup seam"
```

---

### Task 7: Geo API route

**Files:**
- Create: `src/app/api/admin/geo/route.ts`

**Interfaces:**
- Consumes: `EventLogger.topCountries/topCities` (Task 6).
- Produces: `GET /api/admin/geo` → `{ countries: {code,name,flag,count}[]; cities: {city,country,flag,count}[]; totalLocated: number }`.

- [ ] **Step 1: Create the route**

Create `src/app/api/admin/geo/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { EventLogger } from '@/lib/analytics/events'
import { getCurrentUser } from '@/lib/session/server'
import { isAdmin } from '@/lib/auth/guard'

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000

export async function GET() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!isAdmin(user)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const logger = new EventLogger(db)
  const countries = logger.topCountries(WINDOW_MS)
  const cities = logger.topCities(WINDOW_MS)
  const totalLocated = countries.reduce((acc, c) => acc + c.count, 0)

  return NextResponse.json({ countries, cities, totalLocated })
}
```

- [ ] **Step 2: Verify**

```bash
curl -s http://localhost:3000/api/admin/geo
```

Expected (no cookie): `{"error":"No autorizado."}`. Logged-in admin: JSON with demo countries/cities.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/admin/geo/route.ts"
git commit -m "feat(admin): add geo API (top countries/cities, demo fallback)"
```

---

### Task 8: Geografía page

**Files:**
- Create: `src/app/admin/(protected)/geo/page.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/geo` (Task 7); primitives from `adminUi` (Task 3).

- [ ] **Step 1: Create the page**

Create `src/app/admin/(protected)/geo/page.tsx`:

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import { PageTitle, Card, SectionLabel, Kpi, chartTheme, ACCENT, tableHeadStyle, tableCellStyle, monoCellStyle } from '../components/adminUi'

interface Country { code: string; name: string; flag: string; count: number }
interface City { city: string; country: string; flag: string; count: number }
interface GeoData { countries: Country[]; cities: City[]; totalLocated: number }

export default function GeoPage() {
  const [data, setData] = useState<GeoData | null>(null)
  const barRef = useRef<HTMLCanvasElement>(null)
  const chart = useRef<Chart | null>(null)

  useEffect(() => { fetch('/api/admin/geo').then((r) => r.json()).then(setData) }, [])

  useEffect(() => {
    if (!data || !barRef.current) return
    const draw = () => {
      chart.current?.destroy()
      const t = chartTheme()
      chart.current = new Chart(barRef.current!.getContext('2d')!, {
        type: 'bar',
        data: { labels: data.countries.map((c) => c.name), datasets: [{ data: data.countries.map((c) => c.count), backgroundColor: ACCENT, borderRadius: 3, borderWidth: 0 }] },
        options: { animation: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: t.grid }, ticks: { color: t.tick, font: { size: 10 } } }, y: { grid: { color: t.grid }, ticks: { color: t.tick, font: { size: 10 } } } } },
      })
    }
    draw()
    window.addEventListener('adm-theme-change', draw)
    return () => { window.removeEventListener('adm-theme-change', draw); chart.current?.destroy() }
  }, [data])

  if (!data) return <div style={{ padding: '1.25rem', fontFamily: 'var(--adm-font-mono)', fontSize: 12, color: 'var(--adm-muted)' }}>Cargando…</div>

  return (
    <div style={{ padding: '20px 22px' }}>
      <PageTitle title="geografía" sub="UBICACIÓN DE ALUMNOS · DATOS DEMO" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, marginBottom: 9 }}>
        <Kpi label="PAÍSES" value={data.countries.length} sub="con actividad" accent />
        <Kpi label="CIUDADES" value={data.cities.length} sub="distintas" />
        <Kpi label="SESIONES SITUADAS" value={data.totalLocated} sub="últimos 30 días" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Card>
          <SectionLabel style={{ marginBottom: 10 }}>ALUMNOS POR PAÍS</SectionLabel>
          <div style={{ position: 'relative', height: Math.max(140, data.countries.length * 34) }}>
            <canvas ref={barRef} role="img" aria-label="Alumnos por país" />
          </div>
        </Card>
        <Card style={{ padding: 0 }}>
          <SectionLabel style={{ padding: '14px 16px 10px' }}>TOP CIUDADES</SectionLabel>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={tableHeadStyle}>CIUDAD</th><th style={tableHeadStyle}>PAÍS</th><th style={{ ...tableHeadStyle, textAlign: 'right' }}>SESIONES</th></tr></thead>
            <tbody>
              {data.cities.map((c) => (
                <tr key={`${c.city}-${c.country}`}>
                  <td style={tableCellStyle}>{c.flag} {c.city}</td>
                  <td style={monoCellStyle}>{c.country}</td>
                  <td style={{ ...monoCellStyle, textAlign: 'right', color: 'var(--adm-accent-2)' }}>{c.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div style={{ marginTop: 9, fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)' }}>
        Datos de geolocalización de ejemplo. El backend ya captura IP y guarda país/ciudad por evento; falta conectar el lookup geo-IP real en <code>src/lib/analytics/geo.ts</code>.
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Open `/admin/geo`. Expected: Geografía title, 3 KPIs, horizontal country bar chart, cities table with flags. Toggle theme — chart re-renders with correct grid/tick colors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/(protected)/geo/page.tsx"
git commit -m "feat(admin): add Geografía page (countries bar, cities table)"
```

---

### Task 9: Re-skin Overview page (+ Top países + located sessions)

**Files:**
- Modify: `src/app/admin/(protected)/page.tsx`

**Interfaces:**
- Consumes: `/api/admin/analytics`, `/api/admin/users`, `/api/admin/appeals`, `/api/admin/geo`; primitives from `adminUi`.

- [ ] **Step 1: Rebuild the overview using primitives**

Rewrite `src/app/admin/(protected)/page.tsx` so it:
1. `'use client'`; imports `PageTitle, Card, SectionLabel, Kpi, chartTheme, ACCENT, ACCENT_SOFT, ACCENT_DEEP` from `./components/adminUi` and `Chart from 'chart.js/auto'`.
2. Fetches the 4 endpoints in parallel (`analytics`, `users`, `appeals`, `geo`).
3. Header: `<PageTitle title="resumen" sub="VISIÓN GENERAL · SE ACTUALIZA CADA 12S" live />`.
4. KPI grid (6 cols, gap 8): `TOTAL ALUMNOS` (accent), `SESIONES HOY`, `ACTIVOS · 1H`, `TASA REBOTE`, `SESIÓN MEDIA`, `APELACIONES` (accent, value `--adm-accent-2`). Use `<Kpi>`.
5. Row `2fr 1fr`: line chart card (`ACTIVIDAD · ÚLTIMOS 7 DÍAS`, `analytics.summary.byHour.slice(0,7)`, borderColor `ACCENT`, fill `rgba(99,102,241,.14)`) + doughnut card (`LENGUAJES`, data `[58,30,12]`, colors `[ACCENT, ACCENT_SOFT, ACCENT_DEEP]`, custom mono legend below).
6. Row `1fr 1fr 1fr`: `TOP PAÍSES` card (map `geo.countries`, each row `flag name … count` in `--adm-accent-2`), `RETOS MÁS VISITADOS` card (top 5 from `analytics.stuck` or challenges), `DÓNDE SE ATASCAN` card (bars using `--adm-accent` fill on `--adm-track`).
7. `SESIONES RECIENTES` card: list rows showing `flag city, country` on line 1 (derive from `geo.cities` for demo) and `username · path` mono on line 2, with `duration · browser · os` mono on the right.
8. All charts: `animation:false`; register a `draw()` that reads `chartTheme()` and re-runs on `window` `adm-theme-change`; destroy on cleanup.

Use the exact KPI labels and the structure from the approved mockup. Every color via `--adm-*` tokens; chart hexes via the `ACCENT*` consts.

- [ ] **Step 2: Verify**

Open `/admin`. Expected: KPIs, line + donut, Top países / retos / atascos, located recent sessions. Theme toggle re-renders charts.

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/(protected)/page.tsx"
git commit -m "feat(admin): re-skin overview with indigo theme, top countries, located sessions"
```

---

### Task 10: Re-skin Live, Analytics, Sessions pages

**Files:**
- Modify: `src/app/admin/(protected)/live/page.tsx`
- Modify: `src/app/admin/(protected)/analytics/page.tsx`
- Modify: `src/app/admin/(protected)/sessions/page.tsx`

**Interfaces:**
- Consumes: existing `/api/admin/live`, `/api/admin/analytics`, `/api/admin/sessions`; primitives from `adminUi`.

For all three: replace every `var(--color-*)` / `var(--font-mono)` reference with the `--adm-*` equivalents per this map, swap section headers for `<PageTitle>` / `<SectionLabel>`, KPI cards for `<Kpi>`, raised boxes for `<Card>`, and route all chart colors through `chartTheme()` + `ACCENT*`, re-drawing on `adm-theme-change`.

Token map (apply everywhere in these files):

| Old (nonexistent) | New |
|---|---|
| `--color-text-primary` | `--adm-text` |
| `--color-text-secondary` | `--adm-muted` |
| `--color-text-tertiary` | `--adm-label` |
| `--color-text-success` | `--adm-success` |
| `--color-text-danger` | `--adm-danger` |
| `--color-text-info` / `-warning` | `--adm-accent-2` |
| `--color-background-secondary` | `--adm-panel-2` |
| `--color-background-success/info/etc` | `--adm-soft` |
| `--color-border-tertiary` | `--adm-border` |
| `--border-radius-md/lg` | `--adm-radius` |
| `--font-mono` | `--adm-font-mono` |
| `--font-sans` | inherit (omit) |

- [ ] **Step 1: Re-skin live/page.tsx**

Keep the 10s auto-refresh and all data logic. Header `<PageTitle title="en vivo" sub="TIEMPO REAL · ACTUALIZA CADA 10S" live />`. KPIs via `<Kpi>`. Cards via `<Card>`. Active-dot and event-type colors: success/danger/`--adm-accent-2`. Sessions/events tables use `tableHeadStyle`/`monoCellStyle`. Add `flag` to active student rows by reusing the location from the `live` payload if present, else omit.

- [ ] **Step 2: Re-skin analytics/page.tsx**

Header `<PageTitle title="analítica" sub="MÉTRICAS" />`. 4 `<Kpi>`. Hourly bar + horizontal concept bar both via `ACCENT` + `chartTheme()`, redraw on `adm-theme-change`. Devices/browsers/stuck blocks use `<Card>` + `SectionLabel`.

- [ ] **Step 3: Re-skin sessions/page.tsx**

Header `<PageTitle title="sesiones" sub="COMPORTAMIENTO Y DISPOSITIVOS" />`. 3 `<Kpi>`. Duration bar chart via `ACCENT` + `chartTheme()`, redraw on `adm-theme-change`. Sessions table via `tableHeadStyle`/`tableCellStyle`/`monoCellStyle`; prepend a `flag` + city to the ALUMNO/ORIGEN column for demo (derive from the row's existing data or a constant demo list when none).

- [ ] **Step 4: Verify all three**

Open `/admin/live`, `/admin/analytics`, `/admin/sessions`. Each: themed correctly, charts render and re-color on toggle, no console errors about missing variables.

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(protected)/live/page.tsx" "src/app/admin/(protected)/analytics/page.tsx" "src/app/admin/(protected)/sessions/page.tsx"
git commit -m "feat(admin): re-skin live, analytics, sessions to indigo theme"
```

---

### Task 11: Re-skin Users, Appeals, Content, Audit, Settings pages

**Files:**
- Modify: `src/app/admin/(protected)/users/page.tsx`
- Modify: `src/app/admin/(protected)/appeals/page.tsx`
- Modify: `src/app/admin/(protected)/content/page.tsx`
- Modify: `src/app/admin/(protected)/audit/page.tsx`
- Modify: `src/app/admin/(protected)/settings/page.tsx`

**Interfaces:**
- Consumes: their existing APIs; primitives from `adminUi`. (`content/page.tsx` stays a Server Component — it imports only the plain style consts `tableHeadStyle`/`tableCellStyle`/`monoCellStyle` and inline `--adm-*` styles, NOT the client components `Card`/`Kpi`. Define the page's header inline with the same serif-italic markup rather than importing `PageTitle`.)

Apply the same token map as Task 10 to every file. Replace headers with the serif-italic title pattern, KPI cards with `<Kpi>` (client pages only), boxes with `<Card>` (client pages only), tables with the shared table style consts.

- [ ] **Step 1: Re-skin users/page.tsx**

Header `<PageTitle title="alumnos" sub="GESTIÓN" />`. Keep create-admin form + role logic. Form inputs inherit the `.admin-shell input` styles (Task 1) — remove per-input color overrides. "+ nuevo admin" button: `background: var(--adm-soft); color: var(--adm-accent-2); border: 0.5px solid var(--adm-border)`. Role badges: root → `--adm-accent-2`, admin → `--adm-accent`, user → `--adm-muted`.

- [ ] **Step 2: Re-skin appeals/page.tsx**

Header `<PageTitle title="apelaciones" sub="REVISIÓN" />`. Split list/detail panels via `<Card>`. Selected row left border `--adm-accent`. Aceptar button uses `--adm-soft`/`--adm-accent-2`; Rechazar uses a danger tint (`background: rgba(248,113,113,.13); color: var(--adm-danger)`).

- [ ] **Step 3: Re-skin content/page.tsx (server component)**

Header: inline `<div style={{ fontFamily: 'var(--adm-font-display)', fontStyle: 'italic', fontSize: 29, color: 'var(--adm-text)' }}>contenido</div>` + a mono sublabel. 3 KPI stat blocks inline (do NOT import client `Kpi`). Per-concept tables use `tableHeadStyle`/`tableCellStyle`/`monoCellStyle`.

- [ ] **Step 4: Re-skin audit/page.tsx**

Header `<PageTitle title="auditoría" sub="TRAZABILIDAD" />`. Table via shared style consts. `typeLabel()` badge colors: user_create → `--adm-accent-2`, role_change → `--adm-accent`, appeal_accept → `--adm-success`, appeal_reject → `--adm-danger`, maintenance_* → `--adm-accent-2`. All badge backgrounds `--adm-soft` except reject (`rgba(248,113,113,.13)`).

- [ ] **Step 5: Re-skin settings/page.tsx**

Header `<PageTitle title="ajustes" sub="CONFIGURACIÓN" />`. Sections via `<Card>`. Maintenance toggle: active → `--adm-soft`/`--adm-accent-2` "Desactivar"; inactive → danger tint "Activar". Appeals config rows read-only mono.

- [ ] **Step 6: Verify all five**

Open `/admin/users`, `/admin/appeals`, `/admin/content`, `/admin/audit`, `/admin/settings`. Each themed, readable in both modes, tables aligned, no missing-variable artifacts (no black-on-transparent text).

- [ ] **Step 7: Run full test suite + build**

```bash
npm test && npm run build 2>&1 | tail -20
```

Expected: tests pass; build succeeds.

- [ ] **Step 8: Commit**

```bash
git add "src/app/admin/(protected)/users/page.tsx" "src/app/admin/(protected)/appeals/page.tsx" "src/app/admin/(protected)/content/page.tsx" "src/app/admin/(protected)/audit/page.tsx" "src/app/admin/(protected)/settings/page.tsx"
git commit -m "feat(admin): re-skin users, appeals, content, audit, settings to indigo theme"
```

---

## Self-Review Checklist

### Spec coverage

| Requirement | Task |
|---|---|
| Indigo accent replaces crimson | 1, 3, all page tasks |
| Dark/light token system | 1 |
| Theme toggle in sidebar + persistence + no-flash | 2, 4, 5 |
| Geografía nav item | 4 |
| Geo backend (country/city columns, IP capture, demo seam) | 6 |
| Geo API | 7 |
| Geografía page (map-style bar + cities) | 8 |
| Top países on overview | 9 |
| Located sessions (overview + sessions page) | 9, 10 |
| Every page re-skinned, broken `--color-*` vars removed | 9, 10, 11 |
| Charts re-color on theme change | 8, 9, 10 |

### Placeholder scan
- No "TBD"/"TODO" left as work items. The one `TODO(geo-ip)` in `geo.ts` is an intentional, documented seam per the approved "demo + prepare backend" decision.

### Type consistency
- `chartTheme()` returns `{ grid, tick }` — consumed identically in Tasks 8/9/10.
- `EventLogger.topCountries/topCities` shapes match `/api/admin/geo` output and the Geografía + overview consumers.
- `EventInput.ip` optional; `EventRecord.country/city` required strings (default `''`).

### Known scope notes
- The Geografía "map" ships as a horizontal country bar chart, not a literal choropleth (no extra map dependency). A real choropleth (`chartjs-chart-geo` + world-atlas) can be a follow-up once real geo-IP data exists.
- Real geo-IP lookup is intentionally NOT implemented — `lookupGeo()` returns deterministic demo data.
