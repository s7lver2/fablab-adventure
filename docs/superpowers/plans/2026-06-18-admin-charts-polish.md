# Admin Charts — Animación, Degradados, Tipos Nuevos y Badges "DEMO"

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade every admin chart to an animated, polished "data dashboard" look (gradient area fills, glow, smooth curves, center-text doughnuts, indigo-unified palette, entry animations), add four richer visualizations from the reference (activity heatmap, bounce-rate gauge, top-pages funnel, stacked-area traffic-by-page), and clearly mark every section still backed by demo/untracked data with a visible "DEMO" badge.

**Architecture:** A shared chart toolkit lives in the existing `adminUi.tsx` (palette constants, gradient/glow/center-text Chart.js plugins, a standard animation config, and a `DemoBadge` React component). Existing charts are recolored to indigo and given the polish helpers. New visualizations that don't need a heavy chart lib (heatmap, funnel) are built as CSS-grid/flex components; gauge and stacked-area reuse Chart.js. Two new EventLogger aggregations (`byDayHour`, `pageSeries`) feed the heatmap and stacked area with real data. Demo-backed sections (Lenguajes, Conceptos por dificultad, all Geolocalización) keep their current data but render a `DemoBadge`.

**Tech Stack:** Next.js 16.2.9 (App Router, route group `(protected)`), React 19, better-sqlite3, chart.js 4.5 (already installed, no new deps), TypeScript.

## Global Constraints

- Accent stays indigo. Canonical hexes: primary `#6366F1`, secondary `#818CF8`, tints `#A5B4FC` / `#C7D2FE`, point/highlight amber `#FBBF24`. Remove EVERY remaining `#10b981` (green) chart fill and replace with the indigo palette.
- Chart.js canvases cannot read CSS variables — pass hex from the toolkit. All theme-dependent colors (grid, ticks, text) still come from the existing `chartTheme()` helper; re-init charts on the `adm-theme-change` window event (existing pattern — preserve it).
- NEVER leave `animation: false` on any chart. Use the shared `chartAnim` config (`duration: 1100, easing: 'easeOutQuart'`; doughnuts add `animateRotate: true`).
- Section titles stay serif italic lowercase (`var(--adm-font-display)`); labels/stats stay `var(--adm-font-mono)`.
- All admin styling reads `--adm-*` tokens. Never use `var(--color-*)` or `var(--font-mono)`.
- `DemoBadge` goes on every section whose data is demo/untracked: Lenguajes (overview), Conceptos por dificultad (analytics), Top países + Located sessions (overview), and the whole Geografía page (KPIs, countries chart, cities chart). Do NOT add it to genuinely-tracked sections.
- Geolocation stays demo (no real geo-IP call) — it is flagged with `DemoBadge`, not removed.
- No TypeScript `any` unless forced by better-sqlite3 typed `.get()/.all()` — then use an explicit row interface and cast once.
- New heatmap/funnel are CSS components (no Chart.js, no new deps). Gauge and stacked-area use the already-installed Chart.js.
- Respect `prefers-reduced-motion`: when set, charts use `duration: 0`. Provide this via the shared `chartAnim` getter.

## File map

| File | Responsibility |
|------|----------------|
| `src/app/admin/(protected)/components/adminUi.tsx` (modify) | Add palette consts, `chartAnim`, `areaGradient()`, `glowPlugin`, `centerTextPlugin()`, `DemoBadge` |
| `src/app/admin/(protected)/components/Heatmap.tsx` (create) | CSS-grid activity heatmap (hour × day) |
| `src/app/admin/(protected)/components/Gauge.tsx` (create) | Semicircle gauge (Chart.js) for a 0–100 % metric |
| `src/app/admin/(protected)/components/Funnel.tsx` (create) | Ranked horizontal bars for top pages |
| `src/app/admin/(protected)/components/StackedArea.tsx` (create) | Multi-series indigo stacked-area (Chart.js) |
| `src/lib/analytics/events.ts` (modify) | `byDayHour()` and `pageSeries()` aggregations |
| `src/app/admin/(protected)/page.tsx` (modify) | Polish area+doughnut; `DemoBadge` on Lenguajes, Top países, Located sessions; add gauge |
| `src/app/admin/(protected)/analytics/page.tsx` (modify) | Polish/recolor charts; add heatmap, funnel, stacked area; `DemoBadge` on Conceptos |
| `src/app/admin/(protected)/sessions/page.tsx` (modify) | Polish/recolor duration bar; add bounce gauge |
| `src/app/admin/(protected)/geo/page.tsx` (modify) | Polish/recolor charts; `DemoBadge` on KPIs + both charts |

---

### Task 1: Shared chart toolkit in adminUi.tsx

**Files:**
- Modify: `src/app/admin/(protected)/components/adminUi.tsx`

**Interfaces:**
- Consumes: existing `chartTheme()` in the same file.
- Produces:
  - `INDIGO`, `INDIGO_2`, `INDIGO_RAMP: string[]`, `AMBER` color constants
  - `chartAnim(): { duration: number; easing: string }` (returns `duration: 0` under reduced motion)
  - `areaGradient(ctx: CanvasRenderingContext2D, height: number, hex?: string): CanvasGradient`
  - `glowPlugin` (Chart.js plugin object, line glow)
  - `centerTextPlugin(value: string, label: string)` → Chart.js plugin object
  - `DemoBadge({ note?: string }): JSX.Element` React component

- [ ] **Step 1: Read the file**

Read `src/app/admin/(protected)/components/adminUi.tsx` to see existing exports (`Card`, `PageTitle`, `SectionLabel`, `Kpi`, `Grid2`, `chartTheme`) and match the style.

- [ ] **Step 2: Append the toolkit**

Add to `adminUi.tsx` (it already is a client/shared module — keep its current `'use client'` directive if present; if `DemoBadge` is the first component needing it and the file is server-safe, add `'use client'` at the very top):

```tsx
export const INDIGO = '#6366f1'
export const INDIGO_2 = '#818cf8'
export const INDIGO_RAMP = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#4f46e5']
export const AMBER = '#fbbf24'

export function chartAnim(): { duration: number; easing: 'easeOutQuart' } {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  return { duration: reduce ? 0 : 1100, easing: 'easeOutQuart' }
}

export function areaGradient(ctx: CanvasRenderingContext2D, height: number, hex = INDIGO): CanvasGradient {
  const g = ctx.createLinearGradient(0, 0, 0, height)
  const r = parseInt(hex.slice(1, 3), 16), gg = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  g.addColorStop(0, `rgba(${r},${gg},${b},0.42)`)
  g.addColorStop(1, `rgba(${r},${gg},${b},0)`)
  return g
}

export const glowPlugin = {
  id: 'admGlow',
  beforeDatasetDraw(c: { ctx: CanvasRenderingContext2D }, a: { meta: { type: string } }) {
    if (a.meta.type === 'line') { c.ctx.save(); c.ctx.shadowColor = 'rgba(129,140,248,0.55)'; c.ctx.shadowBlur = 12 }
  },
  afterDatasetDraw(c: { ctx: CanvasRenderingContext2D }) { c.ctx.restore() },
}

export function centerTextPlugin(value: string, label: string) {
  return {
    id: 'admCenter',
    afterDraw(c: { ctx: CanvasRenderingContext2D; chartArea: { left: number; right: number; top: number; bottom: number } }) {
      const { ctx, chartArea } = c
      const x = chartArea.left + (chartArea.right - chartArea.left) / 2
      const y = chartArea.top + (chartArea.bottom - chartArea.top) / 2
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      const text = getComputedStyle(document.querySelector('.admin-shell') ?? document.body).getPropertyValue('--adm-text').trim() || '#ece9f5'
      ctx.fillStyle = text; ctx.font = "italic 600 22px Georgia, serif"; ctx.fillText(value, x, y - 4)
      ctx.fillStyle = '#8b85a6'; ctx.font = '9px ui-monospace, monospace'; ctx.fillText(label, x, y + 14)
      ctx.restore()
    },
  }
}

export function DemoBadge({ note = 'Datos de ejemplo · seguimiento real pendiente' }: { note?: string }) {
  return (
    <span
      title={note}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontFamily: 'var(--adm-font-mono)', fontSize: 9, letterSpacing: '0.12em',
        color: 'var(--adm-accent-2)', background: 'var(--adm-soft)',
        border: '1px solid var(--adm-border)', borderRadius: 20, padding: '2px 8px',
      }}
    >
      ● DEMO
    </span>
  )
}
```

- [ ] **Step 3: Build**

```bash
npm run build 2>&1 | tail -20
```

Expected: compiles. Type errors only if `chartTheme` signature was misread — fix by matching the real one.

- [ ] **Step 4: Commit**

```bash
git add "src/app/admin/(protected)/components/adminUi.tsx"
git commit -m "feat(admin): add chart toolkit (palette, gradient, glow, center-text, DemoBadge)"
```

---

### Task 2: Polish + recolor existing charts (overview, analytics, sessions, geo)

**Files:**
- Modify: `src/app/admin/(protected)/page.tsx`
- Modify: `src/app/admin/(protected)/analytics/page.tsx`
- Modify: `src/app/admin/(protected)/sessions/page.tsx`
- Modify: `src/app/admin/(protected)/geo/page.tsx`

**Interfaces:**
- Consumes: `INDIGO`, `INDIGO_RAMP`, `AMBER`, `chartAnim`, `areaGradient`, `glowPlugin`, `centerTextPlugin` (Task 1); existing `chartTheme`.

For EACH chart below, apply the same recipe: (a) delete `animation: false`, add `animation: chartAnim()`; (b) replace any `#10b981` / non-indigo categorical fills with `INDIGO` (single series) or `INDIGO_RAMP` (multi/categorical); (c) keep the existing `chartTheme()` grid/tick/text colors and the `adm-theme-change` re-init listener.

- [ ] **Step 1: Overview area line chart** (`page.tsx` ~lines 83–105)

- Set `data.datasets[0].backgroundColor` to `areaGradient(actRef.getContext('2d')!, actRef.height || 160)`, `borderColor: INDIGO_2`, `borderWidth: 2`, `tension: 0.4`, `pointRadius: 0`, `pointHoverRadius: 4`, `pointBackgroundColor: AMBER`, `fill: true`.
- Register `glowPlugin` in the chart's `plugins` array (third `new Chart(ctx, config, [glowPlugin])` arg).
- `options.animation = chartAnim()`.
- Fix the mislabel: the dataset is hourly (`byHour[24]`). Either label the x-axis with hours (`0h…23h`) OR aggregate to real day buckets. Choose hour labels (smaller change, honest): `labels` = the 24 hour strings already implied by `byHour`. Update the `SectionLabel` text to `actividad · últimas 24 h`.

- [ ] **Step 2: Overview languages doughnut** (`page.tsx` ~lines 107–135)

- `backgroundColor: INDIGO_RAMP.slice(0, 3)`, `cutout: '70%'`, `borderWidth: 0`, `hoverOffset: 6`.
- Register `centerTextPlugin('100%', 'ALUMNOS')` (or compute the top language %); `options.animation = { ...chartAnim(), animateRotate: true }`.
- (DemoBadge added in Task 3.)

- [ ] **Step 3: Analytics hourly bar + concepts bar** (`analytics/page.tsx` ~lines 42–58)

- Hourly bar: `backgroundColor: INDIGO`, `borderRadius: 4`, `borderWidth: 0`, `animation: chartAnim()`.
- Concepts bar: replace the 4-color array with `INDIGO_RAMP.slice(0, 4)`, `borderRadius: 4`, `animation: chartAnim()`. (DemoBadge in Task 3.)

- [ ] **Step 4: Sessions duration bar** (`sessions/page.tsx` ~lines 153–171)

- `backgroundColor: INDIGO`, `borderRadius: 4`, `borderWidth: 0`, `animation: chartAnim()`.

- [ ] **Step 5: Geo countries bar + cities doughnut** (`geo/page.tsx` ~lines 60–79)

- Countries bar: `backgroundColor: INDIGO`, `borderRadius: 4`, `animation: chartAnim()`.
- Cities doughnut: `backgroundColor: INDIGO_RAMP` (cycle as needed for 8 slices — repeat ramp), `cutout: '68%'`, `hoverOffset: 6`, `centerTextPlugin(String(totalCities), 'CIUDADES')`, `animation: { ...chartAnim(), animateRotate: true }`. (DemoBadge in Task 3.)

- [ ] **Step 6: Grep for stragglers**

```bash
grep -rn "10b981\|animation: false\|animation:false" "src/app/admin"
```

Expected: no matches. Fix any that remain.

- [ ] **Step 7: Build + commit**

```bash
npm run build 2>&1 | tail -20
git add "src/app/admin"
git commit -m "feat(admin): polish and recolor all charts to animated indigo"
```

---

### Task 3: "DEMO" badges on untracked sections

**Files:**
- Modify: `src/app/admin/(protected)/page.tsx`
- Modify: `src/app/admin/(protected)/analytics/page.tsx`
- Modify: `src/app/admin/(protected)/geo/page.tsx`

**Interfaces:**
- Consumes: `DemoBadge` (Task 1).

Place `<DemoBadge />` inline in each section header, next to the `SectionLabel`, so it reads e.g. `LENGUAJES  ● DEMO`. Wrap the label + badge in a flex row (`display:flex; align-items:center; gap:8px; justify-content:space-between`).

- [ ] **Step 1: Overview** — add `DemoBadge` to the section headers of: Languages doughnut, Top países, Located sessions (`page.tsx`).

- [ ] **Step 2: Analytics** — add `DemoBadge` to the Conceptos por dificultad section header (`analytics/page.tsx`).

- [ ] **Step 3: Geo** — add `DemoBadge` to: the page subtitle/header area (one badge near `PageTitle "geografía"`), and individually on the countries chart, cities chart, and the three KPI cards' container (one badge in the KPI row header). Use a `note` like `Geolocalización demo · falta geo-IP real`.

- [ ] **Step 4: Build + commit**

```bash
npm run build 2>&1 | tail -20
git add "src/app/admin"
git commit -m "feat(admin): flag demo/untracked sections with DEMO badge"
```

---

### Task 4: Backend aggregations for new charts

**Files:**
- Modify: `src/lib/analytics/events.ts`
- Test: `src/lib/analytics/events.test.ts`

**Interfaces:**
- Produces:
  - `EventLogger.byDayHour(days?: number): number[][]` — 7 rows (Mon..Sun) × 24 cols, event counts.
  - `EventLogger.pageSeries(days?: number, topN?: number): { labels: string[]; series: { path: string; data: number[] }[] }` — daily counts per top path over the window.

- [ ] **Step 1: Add `byDayHour`**

```ts
byDayHour(days = 30): number[][] {
  const since = Date.now() - days * 86400000
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0))
  const rows = this.db
    .prepare('SELECT timestamp FROM events WHERE timestamp > ?')
    .all(since) as { timestamp: number }[]
  for (const r of rows) {
    const d = new Date(r.timestamp)
    const day = (d.getDay() + 6) % 7 // Mon=0..Sun=6
    grid[day][d.getHours()]++
  }
  return grid
}
```

- [ ] **Step 2: Add `pageSeries`**

```ts
pageSeries(days = 7, topN = 4): { labels: string[]; series: { path: string; data: number[] }[] } {
  const since = Date.now() - days * 86400000
  const dayKeys: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    dayKeys.push(`${d.getMonth() + 1}/${d.getDate()}`)
  }
  const top = this.db
    .prepare("SELECT path, COUNT(*) c FROM events WHERE path IS NOT NULL AND timestamp > ? GROUP BY path ORDER BY c DESC LIMIT ?")
    .all(since, topN) as { path: string; c: number }[]
  const series = top.map((t) => {
    const data = new Array(days).fill(0)
    const rows = this.db
      .prepare('SELECT timestamp FROM events WHERE path = ? AND timestamp > ?')
      .all(t.path, since) as { timestamp: number }[]
    for (const r of rows) {
      const idx = days - 1 - Math.floor((Date.now() - r.timestamp) / 86400000)
      if (idx >= 0 && idx < days) data[idx]++
    }
    return { path: t.path, data }
  })
  return { labels: dayKeys, series }
}
```

- [ ] **Step 3: Tests**

Add to `events.test.ts`: insert events across two weekdays/hours, assert `byDayHour()` puts counts in the right cells; insert events on two paths across days, assert `pageSeries()` returns the right labels length (`= days`) and per-path totals.

- [ ] **Step 4: Run tests + commit**

```bash
npm test
git add src/lib/analytics/events.ts src/lib/analytics/events.test.ts
git commit -m "feat(admin): add byDayHour and pageSeries aggregations"
```

---

### Task 5: Activity heatmap component

**Files:**
- Create: `src/app/admin/(protected)/components/Heatmap.tsx`
- Modify: `src/app/admin/(protected)/analytics/page.tsx`
- Modify: `src/app/api/admin/analytics/route.ts` (expose `byDayHour`)

**Interfaces:**
- Consumes: `byDayHour()` (Task 4).
- Produces: `Heatmap({ grid }: { grid: number[][] }): JSX.Element` — 7×24 CSS grid, cell opacity scaled by `count / max`, indigo fill.

- [ ] **Step 1: Expose data**

In `src/app/api/admin/analytics/route.ts`, add `byDayHour: logger.byDayHour()` to the JSON response (alongside existing analytics fields). Keep `isAdmin` guard.

- [ ] **Step 2: Build the component**

```tsx
'use client'
const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
export function Heatmap({ grid }: { grid: number[][] }) {
  const max = Math.max(1, ...grid.flat())
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '18px repeat(24, 1fr)', gap: 3, alignItems: 'center' }}>
      {grid.map((row, d) => (
        <>
          <span key={`l${d}`} style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 9, color: 'var(--adm-label)' }}>{DAYS[d]}</span>
          {row.map((v, h) => (
            <div key={`${d}-${h}`} title={`${DAYS[d]} ${h}:00 · ${v}`}
              style={{ aspectRatio: '1', borderRadius: 3, background: `rgba(99,102,241,${0.08 + 0.92 * (v / max)})` }} />
          ))}
        </>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Place on analytics page**

In `analytics/page.tsx`, add a `Card` with `SectionLabel "actividad por hora y día"` containing `<Heatmap grid={data.byDayHour} />`. This is REAL data — no DemoBadge.

- [ ] **Step 4: Build + commit**

```bash
npm run build 2>&1 | tail -20
git add "src/app/admin/(protected)/components/Heatmap.tsx" "src/app/admin/(protected)/analytics/page.tsx" "src/app/api/admin/analytics/route.ts"
git commit -m "feat(admin): add real activity heatmap (hour x day)"
```

---

### Task 6: Bounce-rate gauge component

**Files:**
- Create: `src/app/admin/(protected)/components/Gauge.tsx`
- Modify: `src/app/admin/(protected)/sessions/page.tsx`

**Interfaces:**
- Consumes: `chartAnim`, `INDIGO`, `INDIGO_RAMP`, `centerTextPlugin` (Task 1).
- Produces: `Gauge({ value, label }: { value: number; label: string }): JSX.Element` — semicircle Chart.js doughnut (`rotation: -90, circumference: 180`), value 0–100, filled arc indigo, track muted, center text shows `value%`.

- [ ] **Step 1: Build the component**

```tsx
'use client'
import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import { chartAnim, INDIGO, centerTextPlugin } from './adminUi'

export function Gauge({ value, label }: { value: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const chart = useRef<Chart | null>(null)
  useEffect(() => {
    if (!ref.current) return
    chart.current?.destroy()
    chart.current = new Chart(ref.current.getContext('2d')!, {
      type: 'doughnut',
      data: { datasets: [{ data: [value, 100 - value], backgroundColor: [INDIGO, 'rgba(255,255,255,0.08)'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, rotation: -90, circumference: 180, cutout: '75%',
        animation: { ...chartAnim(), animateRotate: true }, plugins: { legend: { display: false }, tooltip: { enabled: false } } },
      plugins: [centerTextPlugin(`${Math.round(value)}%`, label)],
    })
    return () => chart.current?.destroy()
  }, [value, label])
  return <div style={{ position: 'relative', height: 150 }}><canvas ref={ref} role="img" aria-label={`${label}: ${Math.round(value)}%`} /></div>
}
```

- [ ] **Step 2: Place on sessions page**

In `sessions/page.tsx`, replace the plain bounce-rate `%` text card with `<Gauge value={bounceRate} label="REBOTE" />` inside its `Card`. Real data — no DemoBadge.

- [ ] **Step 3: Build + commit**

```bash
npm run build 2>&1 | tail -20
git add "src/app/admin/(protected)/components/Gauge.tsx" "src/app/admin/(protected)/sessions/page.tsx"
git commit -m "feat(admin): add animated bounce-rate gauge"
```

---

### Task 7: Top-pages funnel component

**Files:**
- Create: `src/app/admin/(protected)/components/Funnel.tsx`
- Modify: `src/app/admin/(protected)/analytics/page.tsx`

**Interfaces:**
- Produces: `Funnel({ rows }: { rows: { path: string; count: number }[] }): JSX.Element` — ranked horizontal bars; each row = rank number + full-width track + indigo fill scaled to `count / max` + count label.

- [ ] **Step 1: Build the component**

```tsx
export function Funnel({ rows }: { rows: { path: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((r, i) => (
        <div key={r.path} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-label)', width: 14 }}>{i + 1}</span>
          <div style={{ flex: 1, position: 'relative', background: 'var(--adm-track)', borderRadius: 6, height: 26, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, width: `${Math.max(8, (r.count / max) * 100)}%`, background: 'var(--adm-soft)', borderRight: '2px solid var(--adm-accent)' }} />
            <span style={{ position: 'absolute', left: 10, top: 0, lineHeight: '26px', fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-text)' }}>{r.path}</span>
          </div>
          <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-muted)', width: 34, textAlign: 'right' }}>{r.count}</span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Place on analytics page**

In `analytics/page.tsx`, add a `Card` `SectionLabel "páginas más visitadas · embudo"` with `<Funnel rows={topPages} />`, where `topPages` comes from the existing top-pages data the analytics route already returns (reuse it; if not present, derive from `EventLogger` top-paths already used on overview). Real data — no DemoBadge.

- [ ] **Step 3: Build + commit**

```bash
npm run build 2>&1 | tail -20
git add "src/app/admin/(protected)/components/Funnel.tsx" "src/app/admin/(protected)/analytics/page.tsx"
git commit -m "feat(admin): add top-pages funnel"
```

---

### Task 8: Stacked-area traffic-by-page chart

**Files:**
- Create: `src/app/admin/(protected)/components/StackedArea.tsx`
- Modify: `src/app/admin/(protected)/analytics/page.tsx`
- Modify: `src/app/api/admin/analytics/route.ts` (expose `pageSeries`)

**Interfaces:**
- Consumes: `pageSeries()` (Task 4), `chartAnim`, `INDIGO_RAMP`, `areaGradient`, `chartTheme`.
- Produces: `StackedArea({ labels, series }: { labels: string[]; series: { path: string; data: number[] }[] }): JSX.Element` — multi-dataset filled line, stacked y, indigo ramp per series, smooth tension, animated; custom HTML legend above; re-inits on `adm-theme-change`.

- [ ] **Step 1: Expose data**

In `src/app/api/admin/analytics/route.ts`, add `pageSeries: logger.pageSeries()` to the response.

- [ ] **Step 2: Build the component**

```tsx
'use client'
import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import { chartAnim, INDIGO_RAMP, chartTheme } from './adminUi'

export function StackedArea({ labels, series }: { labels: string[]; series: { path: string; data: number[] }[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const chart = useRef<Chart | null>(null)
  useEffect(() => {
    function render() {
      if (!ref.current) return
      const theme = chartTheme()
      chart.current?.destroy()
      chart.current = new Chart(ref.current.getContext('2d')!, {
        type: 'line',
        data: { labels, datasets: series.map((s, i) => ({
          label: s.path, data: s.data, borderColor: INDIGO_RAMP[i % INDIGO_RAMP.length],
          backgroundColor: INDIGO_RAMP[i % INDIGO_RAMP.length] + '55', borderWidth: 1.5, fill: true, tension: 0.4, pointRadius: 0,
        })) },
        options: { responsive: true, maintainAspectRatio: false, animation: chartAnim(),
          plugins: { legend: { display: false } },
          scales: { x: { stacked: true, grid: { display: false }, ticks: { color: theme.textColor, font: { size: 9 } } },
            y: { stacked: true, grid: { color: theme.gridColor }, ticks: { color: theme.textColor, font: { size: 9 } } } } },
      })
    }
    render()
    window.addEventListener('adm-theme-change', render)
    return () => { window.removeEventListener('adm-theme-change', render); chart.current?.destroy() }
  }, [labels, series])
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        {series.map((s, i) => (
          <span key={s.path} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--adm-font-mono)', fontSize: 10, color: 'var(--adm-muted)' }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: INDIGO_RAMP[i % INDIGO_RAMP.length] }} />{s.path}
          </span>
        ))}
      </div>
      <div style={{ position: 'relative', height: 200 }}><canvas ref={ref} role="img" aria-label="Tráfico por página apilado en el tiempo" /></div>
    </>
  )
}
```

- [ ] **Step 3: Place on analytics page**

In `analytics/page.tsx`, add a `Card` `SectionLabel "tráfico por página · 7 días"` with `<StackedArea labels={data.pageSeries.labels} series={data.pageSeries.series} />`. Real data — no DemoBadge.

- [ ] **Step 4: Build + commit**

```bash
npm run build 2>&1 | tail -20
git add "src/app/admin/(protected)/components/StackedArea.tsx" "src/app/admin/(protected)/analytics/page.tsx" "src/app/api/admin/analytics/route.ts"
git commit -m "feat(admin): add stacked-area traffic-by-page chart"
```

---

## Self-Review Checklist

### Spec coverage

| Requirement | Task |
|---|---|
| Charts animated (no `animation:false`) | 1 (`chartAnim`), 2 (applied) |
| Gradient fills + glow + smooth curves | 1 (`areaGradient`/`glowPlugin`), 2 |
| Indigo unified (kill green `#10b981`) | 2 (recolor + grep gate) |
| Center-text doughnuts | 1 (`centerTextPlugin`), 2 |
| New: heatmap | 4 (`byDayHour`), 5 |
| New: gauge | 6 |
| New: funnel | 7 |
| New: stacked area | 4 (`pageSeries`), 8 |
| DEMO badge on Lenguajes + Conceptos | 1 (`DemoBadge`), 3 |
| DEMO badge on all geo | 3 |
| Reduced-motion respected | 1 (`chartAnim`) |
| Theme toggle still re-inits charts | 2, 8 (preserve `adm-theme-change`) |

### Placeholder scan
- No "TBD"/"TODO". Every component ships full code. Task 7's `topPages` reuses existing analytics data — if the route doesn't already return it, the task says derive it from the same EventLogger top-paths used on overview (no new endpoint needed).

### Type consistency
- `DemoBadge`, `chartAnim`, `areaGradient`, `glowPlugin`, `centerTextPlugin`, color consts defined once in Task 1; consumed unchanged in 2/3/5/6/7/8.
- `byDayHour(): number[][]` and `pageSeries(): { labels; series }` defined in Task 4; consumed with identical shapes by Heatmap (5) and StackedArea (8).

### Known scope notes
- Geolocation remains demo by design (flagged, not removed) per the user's choice.
- Overview "7 días" chart is relabeled to "últimas 24 h" to match its real hourly data instead of faking daily buckets.
- Heatmap/funnel are CSS (no Chart.js) to avoid a matrix-chart dependency; gauge/stacked-area reuse the installed Chart.js.
