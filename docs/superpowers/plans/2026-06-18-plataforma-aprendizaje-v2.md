# Plataforma de Aprendizaje v2 — Timeout, Landing, Bloques, Reto, Multi-parte, Perfil, API

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship seven independent improvements to the Fab Lab Quest learning platform: (1) fix the execution-engine bug where a trivial `print` triggers "tardó demasiado"; (2) split `/` into a public landing page and move the student app to `/dashboard`; (3) reskin Blockly to chunky Scratch-style blocks in the warm palette; (4) restructure the challenge page (blocks stay left; lesson+instructions+help move to the right-top; console moves to the right-bottom); (5) add multi-part exercises with escalating difficulty; (6) refine the profile and allow uploading a profile image; (7) add an admin "API" panel to test every endpoint.

**Architecture:** Each feature group is independently shippable and ordered by priority — the timeout bug is first because it currently breaks exercises. The execution fix follows systematic debugging: surface the real worker error first (it is currently masked by the timeout), then fix the root cause, then add a genuine infinite-loop guard. The challenge data model gains a `challenge_parts` dimension (backward-compatible: a challenge with no rows in `challenge_parts` behaves as today). Routing uses Next's file moves plus redirect-target updates (no middleware exists; per-route `getCurrentUser()` stays). The API panel is data-driven from a typed endpoint registry.

**Tech Stack:** Next.js 16.2.9 (App Router, route groups, async route params), React 19, better-sqlite3 (WAL, FK on), Blockly v13, Skulpt (Python), Web Workers, Chart.js 4.5, TypeScript.

## Global Constraints

- App palette is warm: violet `#7c3aed` (dark `#5b27b0`), amber `#f59e0b`/`#fbbf24` (dark `#c97e08`), green `#10b981` (dark `#0a8a61`), text `#2c2438`, muted `#6b6580`, cream surfaces `#faf6ef`/`#fbf8f2`. Do NOT use the admin `--adm-*` tokens anywhere in student-facing UI.
- Student auth is username-only (no password); "registro" = choosing a username. Preserve this.
- Next dynamic route params are async: `const { slug } = await params`.
- No TypeScript `any` unless forced by better-sqlite3 typed `.get()/.all()` — then use an explicit row interface and cast once.
- Schema migrations are idempotent (`try { ALTER TABLE ... } catch {}`), matching the existing pattern in `src/lib/db/schema.ts`.
- Backward compatibility: existing single-problem challenges must keep working after the multi-part change.
- Respect `prefers-reduced-motion` in any new animation.
- Blockly redesign keeps the existing `text_print` → `print()` generator override and the change-listener wiring in `BlocklyEditor.tsx`.
- The execution timeout fix must NOT simply raise the limit and call it done — a trivial `print` timing out is a defect to be root-caused (see Group 1).

## File map (by group)

| Group | Key files |
|------|-----------|
| 1 Timeout | `src/lib/engine/client.ts`, `worker.ts`, `python-worker.ts`, `js-runner.ts`, `python-runner.ts`, `src/app/challenge/[slug]/page.tsx` |
| 2 Routing | `src/app/page.tsx` (→ landing), `src/app/dashboard/page.tsx` (new home), `src/app/api/auth/login/route.ts`, `src/app/onboarding/page.tsx`, `src/app/login/page.tsx`, `src/components/MaintenanceRedirector.tsx` |
| 3 Blocks | `src/app/challenge/[slug]/BlocklyEditor.tsx`, `src/lib/engine/blocks/toolbox.ts`, `src/app/globals.css` |
| 4 Reto layout | `src/app/challenge/[slug]/page.tsx`, `src/app/globals.css` |
| 5 Multi-parte | `src/lib/db/schema.ts`, `src/lib/curriculum/types.ts`, `src/lib/curriculum/repository.ts`, `src/lib/grading/grade.ts`, `src/lib/progress/repository.ts`, `src/app/api/challenges/[slug]/route.ts`, `.../submit/route.ts`, `src/app/challenge/[slug]/page.tsx`, seed data |
| 6 Perfil | `src/lib/db/schema.ts`, `src/lib/users/types.ts`, `profile.ts`, `repository.ts`, `src/app/api/me/route.ts`, `src/components/profile/ProfileHero.tsx`, `ProfileLayout.tsx`, `src/app/profile/ProfileView.tsx`, `globals.css` |
| 7 API panel | `src/app/admin/(protected)/api/page.tsx` (new), `src/lib/admin/endpoints.ts` (new), `src/app/admin/(protected)/components/AdminSidebar.tsx` |

---

## GROUP 1 — Fix the execution timeout bug (URGENT)

> Root-cause first. A trivial `print` returning "Tu programa tardó demasiado" means the worker never posts a result — almost certainly it fails to load/instantiate and the error is masked because `client.ts` has an `onmessage` but no `onerror`. Confirm before fixing.

### Task 1.1: Surface the real worker error (instrumentation)

**Files:** Modify `src/lib/engine/client.ts`

**Interfaces:** Produces a `RunResult.error` that reflects the actual worker failure instead of a misleading timeout.

- [ ] **Step 1: Read** `src/lib/engine/client.ts`, `worker.ts`, `python-worker.ts`.

- [ ] **Step 2: Add error handlers.** In `runInWorker`, after creating the worker and before `postMessage`, add:

```ts
worker.onerror = (ev) => {
  clearTimeout(timer)
  worker.terminate()
  resolve({ output: '', error: `No se pudo ejecutar el código (worker): ${ev.message || 'error al cargar el worker'}`, timeMs: 0 })
}
worker.onmessageerror = () => {
  clearTimeout(timer)
  worker.terminate()
  resolve({ output: '', error: 'No se pudo leer el resultado del worker.', timeMs: 0 })
}
```

- [ ] **Step 3: Reproduce.** Run the app (`npm run dev`), open the `saludo` challenge in blocks mode, build a single `imprimir "Hola"`, click Ejecutar. Record the now-surfaced error message. This identifies the root cause for Task 1.2.

- [ ] **Step 4: Commit** `fix(engine): surface real worker errors instead of masking them as timeouts`.

### Task 1.2: Fix the worker-load root cause

**Files:** depends on Task 1.1 findings — likely `src/lib/engine/client.ts` (worker instantiation), possibly `next.config` worker handling, or `python-runner.ts` (Skulpt load).

**Interfaces:** Consumes Task 1.1's surfaced error. Produces: a trivial `print` runs and returns its output in <100 ms.

- [ ] **Step 1: Diagnose** from the surfaced error. Most likely cause: the `new Worker(new URL('./worker.ts', import.meta.url))` build/instantiation under Next 16 (Turbopack/webpack) fails, or Skulpt fails to load in the Python worker. Read `node_modules/next/dist/docs/` for the current guidance on Web Workers if the error points there.

- [ ] **Step 2: Apply the minimal fix** for the identified cause. Acceptable shapes (pick per evidence): correct the worker URL/instantiation per Next 16 docs; ensure the worker bundles its imports; or, if workers are unviable in this setup, run JS via a same-thread interruptible runner and keep workers only where they load. Do NOT bundle unrelated changes.

- [ ] **Step 3: Verify** the trivial `print` works in blocks, JS, and Python modes. Add/adjust a test in `src/lib/engine/` that runs `print('hola')` through the JS path and asserts `output === 'hola'` with no error.

- [ ] **Step 4: Commit** `fix(engine): make trivial programs execute instead of timing out`.

### Task 1.3: Genuine infinite-loop guard + clearer messaging

**Files:** Modify `src/lib/engine/js-runner.ts`, `src/lib/engine/client.ts`

**Interfaces:** Produces: real infinite loops stop quickly with a helpful message; valid-but-slow programs are not falsely killed.

- [ ] **Step 1: Inject an iteration guard** into JS code before `new Function`. Prepend a counter helper and rewrite loop headers, or wrap with a budget check. Minimal robust approach — inject a `__tick()` that throws after N iterations and call it at the top of every `while`/`for` body via a lightweight transform; if a full transform is risky, instead keep the worker timeout but lower it to ~2s for the JS path AND rely on the worker (now working) to die fast. Document the chosen approach in the commit.

- [ ] **Step 2: Improve the message** in `client.ts` timeout branch to: `'Tu programa tardó demasiado. Si tienes un bucle, revisa que llegue a su fin.'` Keep the timeout constant but set it to a comfortable `5000` ms so valid programs never hit it.

- [ ] **Step 3: Test** an infinite `while(true){}` returns the loop message; a 1000-iteration loop completes.

- [ ] **Step 4: Commit** `feat(engine): guard infinite loops and clarify the timeout message`.

---

## GROUP 2 — Landing at `/` + move app to `/dashboard`

### Task 2.1: Move the student home to `/dashboard`

**Files:** Create `src/app/dashboard/page.tsx`; modify redirect targets in `src/app/api/auth/login/route.ts`, `src/app/onboarding/page.tsx`, `src/app/login/page.tsx` (any post-login redirect).

**Interfaces:** Produces: authenticated student home lives at `/dashboard` with all existing auth/onboarding guards intact.

- [ ] **Step 1:** Move the entire current `src/app/page.tsx` body into a new `src/app/dashboard/page.tsx` (keep the `getCurrentUser` → `/login` redirect and the `chosenLanguage` → `/onboarding` redirect verbatim).
- [ ] **Step 2:** Update every redirect that pointed at `/` for a logged-in student to point at `/dashboard`: `api/auth/login` success, `onboarding` after language set, and any `login` page success redirect. Grep: `grep -rn "redirect('/')\|href = '/'\|push('/')" src/app`.
- [ ] **Step 3:** Build; manually verify login → `/dashboard`, onboarding → `/dashboard`.
- [ ] **Step 4:** Commit `feat(routing): move student home to /dashboard`.

### Task 2.2: Public landing page at `/`

**Files:** Create new `src/app/page.tsx` (landing); modify `src/components/MaintenanceRedirector.tsx`.

**Interfaces:** Consumes `getCurrentUser` (optional). Produces: a public marketing/registration landing; logged-in visitors get a "Continuar →" CTA to `/dashboard`.

- [ ] **Step 1:** Build the landing matching the approved mockup: header (brand "Fab Lab Quest 🦊" + "Entrar" → `/login`), hero (eyebrow pill, serif headline "Del bloque de colores al código real", subhead, primary CTA "Empezar gratis →" → `/login`, secondary "Ver cómo funciona" anchor), and a 3-card feature strip (🧩 bloques / ⭐ retos con estrellas / 🦊 perfil propio). Warm palette, responsive, keyboard-focusable, `prefers-reduced-motion` respected.
- [ ] **Step 2:** Server component reads `getCurrentUser()`; if logged in, swap the hero CTA to "Continuar aprendiendo →" → `/dashboard`. Do NOT redirect — `/` stays publicly viewable.
- [ ] **Step 3:** In `MaintenanceRedirector`, exclude `/` (the landing) so maintenance mode never hides the public page.
- [ ] **Step 4:** Build; verify `/` logged-out shows landing, logged-in shows the Continuar CTA.
- [ ] **Step 5:** Commit `feat(routing): add public landing page at /`.

---

## GROUP 3 — Blocks redesign (Scratch-style + warm palette)

### Task 3.1: Zelos renderer + custom Blockly theme

**Files:** Modify `src/app/challenge/[slug]/BlocklyEditor.tsx`, `src/lib/engine/blocks/toolbox.ts`, `src/app/globals.css`

**Interfaces:** Consumes existing toolbox + `text_print` override. Produces: chunky, rounded, colorful blocks.

- [ ] **Step 1:** In `BlocklyEditor.tsx`, pass `renderer: 'zelos'` and a custom theme to `Blockly.inject`:

```ts
const theme = Blockly.Theme.defineTheme('fablab', {
  name: 'fablab',
  base: Blockly.Themes.Classic,
  blockStyles: {
    text_blocks: { colourPrimary: '#7c3aed', colourSecondary: '#a78bfa', colourTertiary: '#5b27b0' },
    loop_blocks: { colourPrimary: '#f59e0b', colourSecondary: '#fbbf24', colourTertiary: '#c97e08' },
    variable_blocks: { colourPrimary: '#10b981', colourSecondary: '#34d399', colourTertiary: '#0a8a61' },
    math_blocks: { colourPrimary: '#0ea5e9', colourSecondary: '#7dd3fc', colourTertiary: '#0369a1' },
  },
  categoryStyles: {
    text_category: { colour: '#7c3aed' }, loop_category: { colour: '#f59e0b' },
    variable_category: { colour: '#10b981' }, math_category: { colour: '#0ea5e9' },
  },
  componentStyles: { workspaceBackgroundColour: '#fbf8f2', toolboxBackgroundColour: '#f3eee6', flyoutBackgroundColour: '#faf6ef' },
  fontStyle: { family: 'inherit', size: 13, weight: '500' },
})
const workspace = Blockly.inject(ref.current, { toolbox: TOOLBOX, renderer: 'zelos', theme, grid: { spacing: 22, length: 3, colour: '#ece6db', snap: true }, zoom: { controls: true, wheel: true, startScale: 1 }, trashcan: true })
```

- [ ] **Step 2:** In `toolbox.ts`, tag each category with its `categorystyle` (e.g. `"categorystyle": "loop_category"`) so the colors apply. Keep the 4 categories.
- [ ] **Step 3:** Add a few CSS overrides in `globals.css` under a `.blockly-wrap` scope for rounded flyout/trashcan and the toolbox font (only what zelos doesn't cover).
- [ ] **Step 4:** Build; run a challenge; confirm chunky colored blocks render and code still generates on change.
- [ ] **Step 5:** Commit `feat(blocks): chunky Scratch-style Blockly theme in warm palette`.

---

## GROUP 4 — Challenge page layout

### Task 4.1: Restructure into blocks-left, lesson-right-top, console-right-bottom

**Files:** Modify `src/app/challenge/[slug]/page.tsx`, `src/app/globals.css`

**Interfaces:** Consumes the same challenge data + run/submit handlers. Produces: the approved 3-zone layout.

- [ ] **Step 1:** Read `page.tsx`. Re-grid the layout:
  - LEFT column: the code workspace (`BlocklyEditor` for blocks, or the code textarea for js/python) + the Ejecutar / Pista buttons. This is unchanged in content/position, given more width.
  - RIGHT column, TOP card "La lección": the mission narrative + the current part statement + a help/hint block (the Pista content can surface here). Include the multi-part stepper header (Group 5 wires real parts; for now render a single step).
  - RIGHT column, BOTTOM card "Consola · resultado": the program output + test-case pass/fail + the Enviar solución button.
- [ ] **Step 2:** Move the `Misión`/narrative out of the left column into the right-top lesson card. Remove the now-empty/duplicate boxes.
- [ ] **Step 3:** Add the CSS for the new grid (`.challenge-grid`, `.challenge-lesson`, `.challenge-console`) in `globals.css`, warm palette, responsive (stack to one column on narrow screens).
- [ ] **Step 4:** Build; verify blocks left, lesson top-right, console bottom-right; Ejecutar shows output in the console; Enviar works.
- [ ] **Step 5:** Commit `feat(challenge): restructure layout into blocks / lesson / console zones`.

---

## GROUP 5 — Multi-part exercises (escalating difficulty)

### Task 5.1: Data model for parts

**Files:** Modify `src/lib/db/schema.ts`, `src/lib/curriculum/types.ts`

**Interfaces:** Produces:
- table `challenge_parts(id, challenge_id FK, ord)`
- nullable `part_id` columns on `challenge_variants` and `test_cases` (null = legacy whole-challenge content)
- types: `ChallengePart { id, ord, variants: Record<Language, ChallengeVariant>, testCases: TestCase[] }`; `FullChallenge.parts: ChallengePart[]` (empty array = single implicit part built from the legacy variant+testCases).

- [ ] **Step 1:** Add idempotent migrations:
```ts
db.exec(`CREATE TABLE IF NOT EXISTS challenge_parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  ord INTEGER NOT NULL)`)
try { db.exec('ALTER TABLE challenge_variants ADD COLUMN part_id INTEGER REFERENCES challenge_parts(id)') } catch {}
try { db.exec('ALTER TABLE test_cases ADD COLUMN part_id INTEGER REFERENCES challenge_parts(id)') } catch {}
```
- [ ] **Step 2:** Extend `types.ts` with `ChallengePart` and `FullChallenge.parts`.
- [ ] **Step 3:** Build; commit `feat(curriculum): add challenge_parts schema and types`.

### Task 5.2: Repository + grading per part

**Files:** Modify `src/lib/curriculum/repository.ts`, `src/lib/grading/grade.ts`, `src/lib/progress/repository.ts`, `src/lib/db/schema.ts` (part progress)

**Interfaces:** Consumes Task 5.1. Produces: `getChallengeBySlug` returns `parts[]` (synthesizing one implicit part for legacy challenges); grading evaluates a single part; challenge completion = all parts complete.

- [ ] **Step 1:** Add part-progress table:
```ts
db.exec(`CREATE TABLE IF NOT EXISTS challenge_part_progress (
  user_id INTEGER NOT NULL REFERENCES users(id),
  part_id INTEGER NOT NULL REFERENCES challenge_parts(id),
  stars INTEGER NOT NULL DEFAULT 0,
  completed_at INTEGER,
  PRIMARY KEY (user_id, part_id))`)
```
- [ ] **Step 2:** Update `getChallengeBySlug` to load `challenge_parts` ordered by `ord`, each with its `part_id`-scoped variants and test cases. If a challenge has zero parts, return a single synthetic part `{ id: 0, ord: 1, variants, testCases }` from the legacy columns (backward compat).
- [ ] **Step 3:** Update grading to grade one part's outputs against that part's test cases (signature `gradePart(part, outputs, hintsUsed)`), preserving the existing star rules.
- [ ] **Step 4:** Add `ProgressRepository` methods: mark a part complete; check if all parts of a challenge are complete → then mark the challenge complete (existing `progress` row) with stars = min/avg across parts (choose avg, documented).
- [ ] **Step 5:** Tests for: legacy single-part challenge still completes; a 3-part challenge requires all 3.
- [ ] **Step 6:** `npm test`; commit `feat(curriculum): per-part grading and progress`.

### Task 5.3: API + UI for parts (with escalating difficulty content)

**Files:** Modify `src/app/api/challenges/[slug]/route.ts`, `.../submit/route.ts`, `src/app/challenge/[slug]/page.tsx`; seed data file for challenges.

**Interfaces:** Consumes 5.2. Produces: the challenge page advances Parte 1→2→3; submit grades the active part and unlocks the next; the star is earned after the last part.

- [ ] **Step 1:** `GET /api/challenges/[slug]` returns `parts` (each with the user-language variant + inputs) and the user's per-part progress so the page knows the active part.
- [ ] **Step 2:** `POST /api/challenges/[slug]/submit` accepts `{ partId, outputs, hintsUsed }`, grades that part, records part progress, returns `{ correct, stars, nextPartOrd | null, challengeComplete }`.
- [ ] **Step 3:** Wire the stepper in `page.tsx` (the right-top lesson card from Group 4): show Parte N/T, render the active part's statement+help, on correct advance to the next part, on last-part completion show the earned star and "next challenge".
- [ ] **Step 4:** Seed: convert at least the first concept's challenges to 3 parts each with **escalating difficulty** — part 1 trivial variation, part 2 a parameterized variation, part 3 a twist that reuses an earlier concept. Document the seed format.
- [ ] **Step 5:** Build + manual run through a 3-part challenge; `npm test`.
- [ ] **Step 6:** Commit `feat(challenge): multi-part exercises with escalating difficulty`.

---

## GROUP 6 — Profile refinement + image avatar

### Task 6.1: Avatar image upload (schema/type/validation/API)

**Files:** Modify `src/lib/db/schema.ts`, `src/lib/users/types.ts`, `src/lib/users/profile.ts`, `src/lib/users/repository.ts`, `src/app/api/me/route.ts`

**Interfaces:** Produces: `User.avatarImage: string | null`; PATCH `/api/me` accepts `avatarImage`; validated like the banner image (data URL, ≤500 KB).

- [ ] **Step 1:** Migration `try { ALTER TABLE users ADD COLUMN avatar_image TEXT } catch {}`. Map it in `repository.ts` (`avatarImage: row.avatar_image ?? null`) and persist it in `updateProfile`. Extend `ProfileUpdate`.
- [ ] **Step 2:** Validate in `profile.ts` reusing the banner image rules (mime + `MAX_BANNER_IMAGE_CHARS`).
- [ ] **Step 3:** Accept `avatarImage` in PATCH `/api/me` (`body.avatarImage == null ? null : String(...)`).
- [ ] **Step 4:** Build/test; commit `feat(profile): add uploadable avatar image`.

### Task 6.2: Render avatar image + match the approved layout

**Files:** Modify `src/lib/users/profileStats.ts` (add `avatarImage` to `PublicProfile`), `src/components/profile/ProfileHero.tsx`, `ProfileLayout.tsx`, `src/app/profile/ProfileView.tsx`, `src/app/globals.css`

**Interfaces:** Consumes 6.1. Produces: the avatar shows the uploaded image (fallback to emoji); a camera affordance in edit mode; layout matches the final mockup (banner, big avatar with status, badges inline, sobre mí, stats, lessons + hexágono side by side, cambiar lenguaje).

- [ ] **Step 1:** Add `avatarImage` to `PublicProfile` in `profileStats.ts` and to the public API DTO.
- [ ] **Step 2:** In `ProfileHero`, render the image avatar when present (`background: center/cover url(...)`), else the emoji; keep the amber ring + shadow + status dot.
- [ ] **Step 3:** In `ProfileView` edit mode, add an avatar image file input (same FileReader/validation flow as the banner) with a small "📷" overlay on the avatar; keep emoji as fallback option.
- [ ] **Step 4:** Polish `ProfileLayout`/CSS to match the approved mockup (sobre mí block, two stat panels, lessons + hexágono grid, cambiar lenguaje). Reuse existing components.
- [ ] **Step 5:** Build; verify own profile and `/u/[username]` both show the image avatar.
- [ ] **Step 6:** Commit `feat(profile): render uploadable avatar and refine layout`.

---

## GROUP 7 — Admin API testing panel

### Task 7.1: Endpoint registry

**Files:** Create `src/lib/admin/endpoints.ts`

**Interfaces:** Produces: `API_ENDPOINTS: ApiEndpoint[]` where `ApiEndpoint = { group: string; method: 'GET'|'POST'|'PATCH'|'DELETE'; path: string; description: string; auth: 'none'|'user'|'admin'; destructive?: boolean; pathParams?: string[]; body?: { name: string; example: string } }`.

- [ ] **Step 1:** Enumerate all 25 endpoints (auth, me, language, appeals, u/[username], challenges, admin users/appeals/audit/settings/analytics/sessions/geo/live, maintenance). Mark `DELETE /api/me/language`, role changes, and appeal resolutions `destructive: true`. Include example JSON bodies where a body is required.
- [ ] **Step 2:** Build; commit `feat(admin): add API endpoint registry`.

### Task 7.2: API panel page + nav

**Files:** Create `src/app/admin/(protected)/api/page.tsx`; modify `src/app/admin/(protected)/components/AdminSidebar.tsx`

**Interfaces:** Consumes `API_ENDPOINTS`. Produces: an admin-only mini-Postman matching the approved mockup.

- [ ] **Step 1:** Build the page (client component): left column = endpoint list grouped, with colored method chips (GET green, POST indigo, PATCH amber, DELETE red) and a ⚠️ marker on destructive ones; right column = request builder (method+path with editable path params, params/body editors) + "Enviar" + response viewer (status, time, pretty JSON). Use the `--adm-*` admin tokens (this is admin UI).
- [ ] **Step 2:** Sending does `fetch(path, { method, headers, body })` against the same origin (admin session cookie is sent automatically). Show status code, duration, and formatted JSON/text.
- [ ] **Step 3:** For `destructive` endpoints, require a typed/clicked confirmation before sending (e.g. a confirm step that names the consequence — "esto borrará el progreso").
- [ ] **Step 4:** Add an "api" item to `AdminSidebar` (serif italic lowercase) linking to `/admin/api`.
- [ ] **Step 5:** Build; verify GET `/api/me` returns JSON; verify DELETE `/api/me/language` asks for confirmation first.
- [ ] **Step 6:** Commit `feat(admin): add API testing panel`.

---

## Self-Review Checklist

### Spec coverage

| Requirement | Group / Task |
|---|---|
| `print` no longer times out (bug) | 1.1, 1.2 |
| Infinite-loop handling + clear message | 1.3 |
| `/` landing + app at `/dashboard` | 2.1, 2.2 |
| Scratch-style warm blocks | 3.1 |
| Reto: blocks left, lesson+help right-top, console right-bottom | 4.1 |
| Multi-part, escalating difficulty | 5.1, 5.2, 5.3 |
| Profile refined + image avatar | 6.1, 6.2 |
| Admin API testing panel | 7.1, 7.2 |

### Placeholder scan
- Group 1.2's exact fix is evidence-driven by design (systematic debugging) — the task fixes the root cause Task 1.1 surfaces, with acceptable fix shapes enumerated. No "TODO".

### Type consistency
- `ChallengePart`/`FullChallenge.parts` defined in 5.1, consumed unchanged in 5.2/5.3.
- `avatarImage` added to `User` (6.1) and `PublicProfile` (6.2) with the same `string | null` shape across repository, API, and components.
- `ApiEndpoint` defined once in 7.1, consumed in 7.2.

### Known scope notes
- Multi-part is backward compatible: legacy challenges synthesize a single implicit part; only re-seeded challenges get real parts.
- Routing introduces no middleware; per-route `getCurrentUser()` checks are preserved.
- The API panel is admin-only and gates destructive endpoints behind explicit confirmation.
