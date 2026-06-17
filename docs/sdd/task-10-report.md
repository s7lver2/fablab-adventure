# Task 10: Analytics Page — Detailed Metrics

## Overview
Task 10 implements the analytics page redesign for the admin panel, replacing the existing client component with a new Chart.js-based interface featuring detailed metrics, visualizations, and data tables.

## Changes Made

### File Modified
- **src/app/admin/(protected)/analytics/page.tsx** — Complete redesign (client component)

## Implementation Details

### Architecture
The new analytics page is a client component that:
- Fetches data from `/api/admin/analytics` endpoint
- Uses Chart.js for data visualization (bar charts and horizontal bars)
- Displays 4 KPI cards with key metrics
- Renders two chart visualizations
- Shows device and browser statistics in tables
- Displays "stuck" challenges with progress bars

### Components

#### KPI Cards (4 metrics)
1. **eventos totales** — Total event count
2. **sesiones únicas** — Unique sessions count
3. **tasa de rebote** — Bounce rate percentage
4. **duración media** — Average session duration in minutes

#### Charts
1. **Actividad por hora del día (UTC)** — Bar chart with 24 hourly buckets
2. **Retos por concepto** — Horizontal bar chart with 4 concept categories

#### Tables
1. **Dispositivos** — Top 5 devices by frequency
2. **Navegadores** — Top 5 browsers by frequency
3. **Dónde se atascan** — Top 5 challenges where students get stuck (with progress bars)

### Styling
- All styling uses inline styles with CSS variables
- Color scheme:
  - Success: `var(--color-text-success)` (#1D9E75)
  - Info: `var(--color-text-info)` (#185FA5)
  - Warning: `var(--color-text-warning)` (#BA7517)
  - Danger: `var(--color-text-danger)` (#A32D2D)
- Typography: Monospace font (`var(--font-mono)`) for labels and metrics
- Responsive grid layout (4 columns for KPIs, 2 columns for charts/tables)

### Data Flow
1. Component mounts → `fetch('/api/admin/analytics')`
2. Data state updates
3. useEffect triggers Chart.js initialization
4. Charts render with computed styles from CSS variables
5. Tables render sorted by frequency (descending)

### Error Handling
- Loading state displays "Cargando…" message
- Null check for data before rendering charts
- Empty states for all data sections

## Dependencies
- **chart.js** ^4.x.x — Already installed in Task 1

## Testing
The page expects the following API response structure:
```typescript
{
  summary: {
    totalEvents: number
    sessions: number
    activeUsers: number
    bounceSessions: number
    avgSessionMs: number
    byHour: number[] // 24 elements for each hour
  }
  devices: Record<string, number>
  browsers: Record<string, number>
  stuck: Array<{
    challengeId: number
    challengeTitle: string
    current: number
  }>
}
```

## Verification Checklist
- [x] 4 KPI cards display correctly
- [x] Bar chart renders 24 hourly buckets
- [x] Horizontal bar chart renders 4 concepts
- [x] Devices table shows top 5 by frequency
- [x] Browsers table shows top 5 by frequency
- [x] "Dónde se atascan" section with progress bars
- [x] Loading state displays "Cargando…"
- [x] Empty states for data sections
- [x] Chart cleanup on unmount (destroy charts)

## Notes
- Uses exact code from plan Task 10 section
- All styling via CSS variables ensures consistency with admin panel theme
- Chart colors hardcoded (#1D9E75, #185FA5, etc.) for visual hierarchy
- Canvas references managed with useRef for Chart.js lifecycle
- No external CSS files — inline styles only
