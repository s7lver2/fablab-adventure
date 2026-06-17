# Hito B — Adaptatividad y motores — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **ADVERTENCIA DE PROCESO (lección del Hito A):** Dos bugs del Hito A vinieron de subagentes que **reescribieron la firma de una función y su propio test** para que pasara, divergiendo del contrato del plan. El código de cada Step de este plan es el CONTRATO. Si un test del plan está incluido, cópialo **literalmente** — no lo reescribas para que encaje con otra implementación. El revisor de spec DEBE comparar el test implementado contra el test del plan, carácter a carácter, no solo verificar que "pasa".

**Goal:** Convertir el bucle lineal del Hito A en la experiencia adaptativa completa: tres lenguajes (JS, Python, Bloques), validación con entradas aleatorias por intento mediante solución de referencia, y progresión por grafo "elige tu propia aventura" con ramas según estrellas, visualizada como árbol.

**Architecture:** Sobre el Hito A (Next.js + SQLite + ejecución en navegador). Se añaden: dos motores nuevos en Workers (Pyodide para Python, Blockly→JS para bloques) con el mismo contrato que el motor JS; un ejecutor server-side de la *solución de referencia del autor* (Node `vm` con timeout, código de confianza) que calcula salidas esperadas para entradas generadas aleatoriamente por intento; un token HMAC que liga las entradas servidas a la verificación del submit (sin estado en servidor); y un grafo de nodos/aristas que reemplaza la progresión lineal.

**Tech Stack:** Next.js 15, React 19, TypeScript, better-sqlite3, Vitest, Web Workers, Pyodide (WASM), Blockly, Node `vm` + `crypto`.

**Alcance (spec §12, Hito B):** 3 motores + estrellas (ya hechas en A) + grafo con aristas + entradas aleatorias/solución de referencia + visualización del árbol. NO incluye: apelaciones (Hito C) ni panel de admin (Hito D).

---

## Convenciones

- npm; comandos desde la raíz `E:\fablableon-coding`.
- Tests Vitest en `*.test.ts` junto al código.
- Commits frecuentes, mensajes en español con prefijo convencional.
- **Reusar** lo del Hito A; no duplicar `runJs`, `computeStars`, `matchesExpected`, etc.

## Estado de partida (Hito A — ya existe)

```
src/lib/engine/js-runner.ts      runJs(code, input) → {output, error?, timeMs}; friendlyError(err)
src/lib/engine/worker.ts         Worker JS que envuelve runJs
src/lib/engine/client.ts         runInWorker(code, input) → Promise<RunResult> (timeout 3s)
src/lib/grading/validate.ts      normalize(s), matchesExpected(produced, expected)
src/lib/grading/stars.ts         computeStars({correct, attempts, hintsUsed})
src/lib/grading/grade.ts         gradeSubmission({producedOutputs, testCases, attempts, hintsUsed}) → {correct, stars}
src/lib/curriculum/types.ts      Language='blocks'|'js'|'python'; ChallengeVariant; TestCase{input,expectedOutput}; FullChallenge
src/lib/curriculum/repository.ts CurriculumRepository: listChallenges(), getChallengeBySlug()
src/lib/curriculum/seed.ts       seedCurriculum(db): retos 'saludo' y 'contar' (solo variante js)
src/lib/progress/repository.ts   ProgressRepository: get(), recordAttempt({stars,hintsUsed,completed}), completedChallengeIds()
src/lib/progress/next.ts         nextChallengeSlug(challenges, completedIds)  ← lo reemplaza el grafo
src/lib/session/server.ts        getCurrentUser(repo); SESSION_SECRET via env
src/app/api/challenges/[slug]/route.ts        GET reto
src/app/api/challenges/[slug]/submit/route.ts POST envío
src/app/challenge/[slug]/page.tsx             editor + ejecutar + enviar
src/app/page.tsx                              currículo lineal
```

## Estructura de ficheros (nuevos / modificados en Hito B)

```
Modify src/lib/db/schema.ts            + columnas reference_solution, input_spec en challenges; + tablas story_nodes, story_edges, user_journey; helper addColumnIfMissing
Create src/lib/grading/inputs.ts       generateInputs(spec, rng) — entradas (fijas + aleatorias) deterministas dado rng
Create src/lib/grading/reference.ts    runReference(code, input) (Node vm + timeout); expectedOutputs(refCode, inputs)
Create src/lib/grading/attempt-token.ts signInputs(inputs, secret) / verifyInputs(token, secret)
Modify src/lib/curriculum/types.ts     + reference_solution, input_spec en el modelo de reto; variants ahora puede traer blocks/python
Modify src/lib/curriculum/repository.ts getChallengeBySlug devuelve referenceSolution + inputSpec + todas las variantes
Modify src/lib/curriculum/seed.ts      retos con referenceSolution + inputSpec + variantes js/python/blocks; siembra del grafo
Modify src/app/api/challenges/[slug]/route.ts  genera entradas, firma token, devuelve variantes + lenguajes + token
Modify src/app/api/challenges/[slug]/submit/route.ts  verifica token, calcula esperado con referencia, grade, avanza grafo
Create src/lib/engine/python-runner-source.ts  fuente del worker Python (string para Blob) o worker dedicado
Create src/lib/engine/python-client.ts  runPython(code, input) en Worker con Pyodide + timeout
Create src/lib/engine/blocks/toolbox.ts blocks/generator: set de bloques permitidos + compilación a JS
Create src/app/challenge/[slug]/BlocklyEditor.tsx  editor de bloques (cliente)
Create src/lib/engine/run-any.ts       runByLanguage(language, code, input) → unifica los 3 motores en el cliente
Create src/lib/story/types.ts          StoryNode, StoryEdge, Outcome
Create src/lib/story/graph.ts          resolveNextNode(edges, currentNodeId, stars) (puro)
Create src/lib/story/repository.ts     StoryRepository: nodos, aristas, journey del usuario
Create src/app/api/journey/route.ts    GET estado del árbol del usuario (nodos, aristas, actual, completados)
Create src/app/tree/page.tsx           visualización del árbol de aprendizaje
Modify src/app/page.tsx                home enlaza al árbol y al nodo actual
```

---

### Task 1: Esquema — entradas aleatorias y grafo

**Files:**
- Modify: `src/lib/db/schema.ts`
- Test: `src/lib/db/schema-b.test.ts`

**Contexto:** `createSchema` usa `CREATE TABLE IF NOT EXISTS`, que NO añade columnas a tablas existentes. Para no perder datos locales añadimos un helper idempotente `addColumnIfMissing`. Las tablas nuevas se crean con `IF NOT EXISTS`.

- [ ] **Step 1: Escribir el test que falla**

Create `src/lib/db/schema-b.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from './schema'

function columns(db: Database.Database, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name)
}

describe('esquema Hito B', () => {
  it('challenges tiene columnas reference_solution e input_spec', () => {
    const db = new Database(':memory:')
    createSchema(db)
    const cols = columns(db, 'challenges')
    expect(cols).toContain('reference_solution')
    expect(cols).toContain('input_spec')
  })

  it('crea las tablas del grafo', () => {
    const db = new Database(':memory:')
    createSchema(db)
    const tables = (db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[]).map((t) => t.name)
    expect(tables).toEqual(expect.arrayContaining(['story_nodes', 'story_edges', 'user_journey']))
  })

  it('es idempotente (llamar dos veces no rompe)', () => {
    const db = new Database(':memory:')
    createSchema(db)
    expect(() => createSchema(db)).not.toThrow()
  })
})
```

- [ ] **Step 2: Ejecutar para verificar que falla**

Run: `npm test -- schema-b`
Expected: FAIL (faltan columnas/tablas).

- [ ] **Step 3: Modificar el esquema**

En `src/lib/db/schema.ts`, dentro de `createSchema`, **después** del `db.exec(...)` existente y **antes** de `seedRoot(db)`, añade:
```typescript
  // --- Hito B: columnas de validación por referencia ---
  addColumnIfMissing(db, 'challenges', 'reference_solution', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(db, 'challenges', 'input_spec', "TEXT NOT NULL DEFAULT ''")

  // --- Hito B: grafo de historia ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS story_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenge_id INTEGER NOT NULL REFERENCES challenges(id),
      is_start INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS story_edges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_node INTEGER NOT NULL REFERENCES story_nodes(id),
      outcome TEXT NOT NULL,
      to_node INTEGER NOT NULL REFERENCES story_nodes(id),
      UNIQUE(from_node, outcome)
    );
    CREATE TABLE IF NOT EXISTS user_journey (
      user_id INTEGER PRIMARY KEY REFERENCES users(id),
      current_node INTEGER REFERENCES story_nodes(id)
    );
  `)
```

Y añade el helper al final del fichero (fuera de `createSchema`):
```typescript
function addColumnIfMissing(
  db: Database.Database,
  table: string,
  column: string,
  ddl: string,
): void {
  const cols = (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(
    (c) => c.name,
  )
  if (!cols.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`)
  }
}
```

- [ ] **Step 4: Ejecutar para verificar que pasa**

Run: `npm test -- schema-b`
Expected: PASS (3 tests).

- [ ] **Step 5: Ejecutar toda la batería (no romper Hito A)**

Run: `npm test`
Expected: PASS (todos, incluidos los del Hito A).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(b): esquema para entradas por referencia y grafo de historia"
```

---

### Task 2: Generador de entradas (puro, determinista)

**Files:**
- Create: `src/lib/grading/inputs.ts`
- Test: `src/lib/grading/inputs.test.ts`

**Contexto:** Cada reto define `input_spec` (JSON). El generador produce un array de entradas para un intento. Acepta una función `rng` (0..1) inyectada → determinista y testeable. En producción se pasa `Math.random`.

Formato de `input_spec` soportado (mínimo de Hito B):
```json
{ "cases": [ { "type": "fixed", "value": { "hasta": 1000 } },
             { "type": "int", "name": "hasta", "min": 500, "max": 2000 } ] }
```
- `fixed`: usa `value` tal cual.
- `int`: genera `{ [name]: entero aleatorio en [min,max] }`.

- [ ] **Step 1: Escribir el test que falla**

Create `src/lib/grading/inputs.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { generateInputs } from './inputs'

describe('generateInputs', () => {
  it('devuelve el valor fijo tal cual', () => {
    const spec = { cases: [{ type: 'fixed', value: { hasta: 1000 } }] }
    expect(generateInputs(spec, () => 0.5)).toEqual([{ hasta: 1000 }])
  })

  it('genera un entero en [min,max] de forma determinista dado el rng', () => {
    const spec = { cases: [{ type: 'int', name: 'hasta', min: 500, max: 2000 }] }
    // rng=0 → min; rng justo por debajo de 1 → max
    expect(generateInputs(spec, () => 0)).toEqual([{ hasta: 500 }])
    expect(generateInputs(spec, () => 0.999999)).toEqual([{ hasta: 2000 }])
  })

  it('soporta varios casos en orden', () => {
    const spec = {
      cases: [
        { type: 'fixed', value: { hasta: 3 } },
        { type: 'int', name: 'hasta', min: 10, max: 10 },
      ],
    }
    expect(generateInputs(spec, () => 0.5)).toEqual([{ hasta: 3 }, { hasta: 10 }])
  })

  it('spec vacío o sin cases devuelve [null] (reto sin entrada)', () => {
    expect(generateInputs({}, () => 0.5)).toEqual([null])
    expect(generateInputs({ cases: [] }, () => 0.5)).toEqual([null])
  })
})
```

- [ ] **Step 2: Ejecutar para verificar que falla**

Run: `npm test -- inputs`
Expected: FAIL ("Cannot find module './inputs'").

- [ ] **Step 3: Implementar el generador**

Create `src/lib/grading/inputs.ts`:
```typescript
export type InputCase =
  | { type: 'fixed'; value: unknown }
  | { type: 'int'; name: string; min: number; max: number }

export interface InputSpec {
  cases?: InputCase[]
}

/** rng: función que devuelve un float en [0,1). En producción, Math.random. */
export function generateInputs(spec: InputSpec, rng: () => number): unknown[] {
  const cases = spec.cases ?? []
  if (cases.length === 0) return [null]
  return cases.map((c) => {
    if (c.type === 'fixed') return c.value
    // type === 'int'
    const span = c.max - c.min
    const value = c.min + Math.floor(rng() * (span + 1))
    return { [c.name]: Math.min(value, c.max) }
  })
}
```

- [ ] **Step 4: Ejecutar para verificar que pasa**

Run: `npm test -- inputs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(b): generador de entradas aleatorias deterministas"
```

---

### Task 3: Ejecutor de la solución de referencia (servidor)

**Files:**
- Create: `src/lib/grading/reference.ts`
- Test: `src/lib/grading/reference.test.ts`

**Contexto:** El servidor ejecuta la **solución de referencia del autor** (código de confianza, NUNCA del alumno) para obtener la salida esperada de cada entrada. Se usa `node:vm` con `timeout` para que un autor con un bucle infinito no cuelgue el servidor. La API expuesta al código es la misma que el motor del alumno: `input` y `print(...)`.

- [ ] **Step 1: Escribir el test que falla**

Create `src/lib/grading/reference.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { runReference, expectedOutputs } from './reference'

describe('runReference', () => {
  it('ejecuta la solución del autor y captura print', () => {
    const code = 'for (let i = 1; i <= input.hasta; i++) print("Hola " + i)'
    expect(runReference(code, { hasta: 3 })).toBe('Hola 1\nHola 2\nHola 3')
  })

  it('aborta por timeout si el autor escribe un bucle infinito', () => {
    expect(() => runReference('while (true) {}', null)).toThrow()
  })
})

describe('expectedOutputs', () => {
  it('calcula la salida esperada para cada entrada', () => {
    const code = 'print(input.n * 2)'
    expect(expectedOutputs(code, [{ n: 1 }, { n: 21 }])).toEqual(['2', '42'])
  })
})
```

- [ ] **Step 2: Ejecutar para verificar que falla**

Run: `npm test -- reference`
Expected: FAIL ("Cannot find module './reference'").

- [ ] **Step 3: Implementar el ejecutor**

Create `src/lib/grading/reference.ts`:
```typescript
import vm from 'node:vm'

const REFERENCE_TIMEOUT_MS = 1000

/**
 * Ejecuta la solución de referencia del AUTOR (código de confianza) sobre una entrada,
 * capturando lo impreso con print(). Usa node:vm con timeout para acotar bucles infinitos.
 */
export function runReference(code: string, input: unknown): string {
  const lines: string[] = []
  const sandbox = {
    input,
    print: (...args: unknown[]) => {
      lines.push(args.map((a) => String(a)).join(' '))
    },
  }
  const context = vm.createContext(sandbox)
  const script = new vm.Script(`"use strict";\n${code}`)
  script.runInContext(context, { timeout: REFERENCE_TIMEOUT_MS })
  return lines.join('\n')
}

export function expectedOutputs(referenceCode: string, inputs: unknown[]): string[] {
  return inputs.map((input) => runReference(referenceCode, input))
}
```

- [ ] **Step 4: Ejecutar para verificar que pasa**

Run: `npm test -- reference`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(b): ejecutor de la solución de referencia (vm + timeout)"
```

---

### Task 4: Token firmado de entradas

**Files:**
- Create: `src/lib/grading/attempt-token.ts`
- Test: `src/lib/grading/attempt-token.test.ts`

**Contexto:** El GET del reto genera entradas aleatorias y las firma en un token (HMAC, igual patrón que `session/cookie.ts`). El cliente lo reenvía en el submit; el servidor verifica el token y reconstruye las MISMAS entradas para calcular la salida esperada. Así no hay estado en servidor y el alumno no puede alterar las entradas.

- [ ] **Step 1: Escribir el test que falla**

Create `src/lib/grading/attempt-token.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { signInputs, verifyInputs } from './attempt-token'

const SECRET = 'test-secret'

describe('attempt-token', () => {
  it('firma y recupera las entradas', () => {
    const inputs = [{ hasta: 1234 }]
    const token = signInputs(inputs, SECRET)
    expect(verifyInputs(token, SECRET)).toEqual(inputs)
  })

  it('rechaza un token manipulado', () => {
    const token = signInputs([{ hasta: 1 }], SECRET)
    const tampered = token.slice(0, -2) + (token.endsWith('a') ? 'bb' : 'aa')
    expect(verifyInputs(tampered, SECRET)).toBeNull()
  })

  it('rechaza otro secreto', () => {
    const token = signInputs([{ hasta: 1 }], SECRET)
    expect(verifyInputs(token, 'otro')).toBeNull()
  })
})
```

- [ ] **Step 2: Ejecutar para verificar que falla**

Run: `npm test -- attempt-token`
Expected: FAIL ("Cannot find module './attempt-token'").

- [ ] **Step 3: Implementar el token**

Create `src/lib/grading/attempt-token.ts`:
```typescript
import { createHmac, timingSafeEqual } from 'node:crypto'

export function signInputs(inputs: unknown[], secret: string): string {
  const body = Buffer.from(JSON.stringify(inputs)).toString('base64url')
  const sig = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyInputs(token: string, secret: string): unknown[] | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts
  const expected = createHmac('sha256', secret).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Ejecutar para verificar que pasa**

Run: `npm test -- attempt-token`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(b): token HMAC de entradas de intento"
```

---

### Task 5: Currículo con referencia + variantes (tipos, repo, seed)

**Files:**
- Modify: `src/lib/curriculum/types.ts`, `src/lib/curriculum/repository.ts`, `src/lib/curriculum/seed.ts`
- Test: `src/lib/curriculum/repository-b.test.ts`

**Contexto:** Los retos pasan a tener `referenceSolution` + `inputSpec` y variantes en `js`, `python` y `blocks`. El seed migra los retos `saludo` y `contar` y los amplía.

- [ ] **Step 1: Escribir el test que falla**

Create `src/lib/curriculum/repository-b.test.ts`:
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

describe('CurriculumRepository (Hito B)', () => {
  it('el reto contar trae referenceSolution e inputSpec', () => {
    const c = seeded().getChallengeBySlug('contar')!
    expect(c.referenceSolution).toContain('print')
    expect(c.inputSpec.cases?.length).toBeGreaterThanOrEqual(1)
  })

  it('contar tiene variantes en los tres lenguajes', () => {
    const c = seeded().getChallengeBySlug('contar')!
    expect(c.variants.js).toBeTruthy()
    expect(c.variants.python).toBeTruthy()
    expect(c.variants.blocks).toBeTruthy()
  })
})
```

- [ ] **Step 2: Ejecutar para verificar que falla**

Run: `npm test -- repository-b`
Expected: FAIL (referenceSolution undefined / falta variante).

- [ ] **Step 3: Ampliar los tipos**

En `src/lib/curriculum/types.ts`, añade el import del spec y amplía `FullChallenge`:
```typescript
import type { InputSpec } from '../grading/inputs'
```
Y dentro de `FullChallenge` añade dos campos (manteniendo los existentes):
```typescript
  referenceSolution: string
  inputSpec: InputSpec
```

- [ ] **Step 4: Ampliar el repositorio**

En `src/lib/curriculum/repository.ts`, dentro de `getChallengeBySlug`:

1. Cambia el SELECT del reto para traer las columnas nuevas:
```typescript
    const row = this.db
      .prepare(
        'SELECT id, slug, title, ord, narrative, reference_solution, input_spec FROM challenges WHERE slug = ?',
      )
      .get(slug) as
      | (ChallengeSummary & { narrative: string; reference_solution: string; input_spec: string })
      | undefined
```

2. En el objeto devuelto, añade:
```typescript
      referenceSolution: row.reference_solution,
      inputSpec: row.input_spec ? JSON.parse(row.input_spec) : {},
```

(El parseo de variantes y `testCases` se mantiene igual que en el Hito A.)

- [ ] **Step 5: Reescribir el seed**

Reemplaza el contenido de `src/lib/curriculum/seed.ts`:
```typescript
import type Database from 'better-sqlite3'

interface SeedVariant {
  language: 'js' | 'python' | 'blocks'
  statement: string
  starterCode: string
  hints: string[]
}

interface SeedChallenge {
  slug: string
  title: string
  narrative: string
  ord: number
  referenceSolution: string
  inputSpec: object
  variants: SeedVariant[]
}

const CHALLENGES: SeedChallenge[] = [
  {
    slug: 'saludo',
    title: 'Tu primer saludo',
    narrative: 'Haz que el ordenador salude.',
    ord: 0,
    referenceSolution: 'print("Hola mundo")',
    inputSpec: { cases: [{ type: 'fixed', value: null }] },
    variants: [
      { language: 'js', statement: 'Imprime exactamente: Hola mundo', starterCode: 'print("...")', hints: ['Usa print("Hola mundo")'] },
      { language: 'python', statement: 'Imprime exactamente: Hola mundo', starterCode: 'print("...")', hints: ['Usa print("Hola mundo")'] },
      { language: 'blocks', statement: 'Imprime exactamente: Hola mundo', starterCode: '', hints: ['Arrastra un bloque "imprimir" con el texto Hola mundo'] },
    ],
  },
  {
    slug: 'contar',
    title: 'Cuenta hasta el final',
    narrative: 'Saluda a cada número.',
    ord: 1,
    referenceSolution: 'for (let i = 1; i <= input.hasta; i++) print("Hola " + i)',
    inputSpec: { cases: [{ type: 'int', name: 'hasta', min: 500, max: 2000 }] },
    variants: [
      { language: 'js', statement: 'Imprime "Hola N" para cada N de 1 a input.hasta, uno por línea.', starterCode: 'for (let i = 1; i <= input.hasta; i++) {\n  // tu código\n}', hints: ['Usa print dentro de un bucle for'] },
      { language: 'python', statement: 'Imprime "Hola N" para cada N de 1 a input["hasta"], uno por línea.', starterCode: 'for i in range(1, input["hasta"] + 1):\n    pass  # tu código', hints: ['Usa print dentro de un for con range'] },
      { language: 'blocks', statement: 'Imprime "Hola N" para cada N de 1 a hasta.', starterCode: '', hints: ['Usa un bloque de repetición y otro de imprimir'] },
    ],
  },
]

/** Siembra el currículo y el grafo lineal por defecto (idempotente). */
export function seedCurriculum(db: Database.Database): void {
  if (db.prepare('SELECT 1 FROM challenges LIMIT 1').get()) return

  const conceptId = Number(
    db
      .prepare("INSERT INTO concepts (slug, name, description, ord) VALUES ('fundamentos', 'Fundamentos', 'Primeros pasos', 0)")
      .run().lastInsertRowid,
  )

  const insChallenge = db.prepare(
    `INSERT INTO challenges (concept_id, slug, title, narrative, ord, reference_solution, input_spec)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
  const insVariant = db.prepare(
    `INSERT INTO challenge_variants (challenge_id, language, statement, starter_code, hints_json)
     VALUES (?, ?, ?, ?, ?)`,
  )
  const insNode = db.prepare(
    'INSERT INTO story_nodes (challenge_id, is_start) VALUES (?, ?)',
  )

  const nodeIds: number[] = []
  CHALLENGES.forEach((ch, idx) => {
    const challengeId = Number(
      insChallenge.run(conceptId, ch.slug, ch.title, ch.narrative, ch.ord, ch.referenceSolution, JSON.stringify(ch.inputSpec)).lastInsertRowid,
    )
    for (const v of ch.variants) {
      insVariant.run(challengeId, v.language, v.statement, v.starterCode, JSON.stringify(v.hints))
    }
    nodeIds.push(Number(insNode.run(challengeId, idx === 0 ? 1 : 0).lastInsertRowid))
  })

  // Grafo lineal por defecto: 3★ y 2★ avanzan al siguiente nodo (si existe).
  const insEdge = db.prepare(
    'INSERT INTO story_edges (from_node, outcome, to_node) VALUES (?, ?, ?)',
  )
  for (let i = 0; i < nodeIds.length - 1; i++) {
    insEdge.run(nodeIds[i], '3star', nodeIds[i + 1])
    insEdge.run(nodeIds[i], '2star', nodeIds[i + 1])
  }
}
```

- [ ] **Step 6: Ejecutar para verificar que pasa**

Run: `npm test -- repository-b`
Expected: PASS (2 tests).

- [ ] **Step 7: Actualizar el test del Hito A que exigía test_cases**

El nuevo seed ya **no** inserta en `test_cases` (la validación pasa a usar la solución de referencia), así que el test del Hito A `src/lib/curriculum/repository.test.ts` que comprueba `full.testCases.length >= 1` fallará. Sustituye **solo ese caso** por una comprobación de la solución de referencia. En `src/lib/curriculum/repository.test.ts`, reemplaza el caso:

```typescript
  it('devuelve un reto con su variante JS y casos de prueba (sin salida esperada en la variante)', () => {
    const repo = seeded()
    const slug = repo.listChallenges()[0].slug
    const full = repo.getChallengeBySlug(slug)!
    expect(full.variants.js).toBeTruthy()
    expect(full.testCases.length).toBeGreaterThanOrEqual(1)
    expect(full.testCases[0].expectedOutput).toBeTruthy()
  })
```

por:

```typescript
  it('devuelve un reto con su variante JS y su solución de referencia', () => {
    const repo = seeded()
    const slug = repo.listChallenges()[0].slug
    const full = repo.getChallengeBySlug(slug)!
    expect(full.variants.js).toBeTruthy()
    expect(full.referenceSolution.length).toBeGreaterThan(0)
  })
```

(No toques los otros dos casos de ese fichero — listar en orden y slug inexistente siguen válidos.)

- [ ] **Step 8: No romper el resto**

Run: `npm test`
Expected: PASS todos. (El reto `saludo`/`contar` siguen existiendo con slug y variante `js`; ningún consumidor depende ya de `test_cases` sembrados.)

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(b): retos con solución de referencia, input_spec y variantes en 3 lenguajes + grafo lineal sembrado"
```

---

### Task 6: Grafo de historia — resolución por estrellas (puro)

**Files:**
- Create: `src/lib/story/types.ts`, `src/lib/story/graph.ts`
- Test: `src/lib/story/graph.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Create `src/lib/story/graph.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { resolveNextNode } from './graph'
import type { StoryEdge } from './types'

const edges: StoryEdge[] = [
  { fromNode: 1, outcome: '3star', toNode: 3 },
  { fromNode: 1, outcome: '2star', toNode: 2 },
]

describe('resolveNextNode', () => {
  it('3 estrellas sigue la arista 3star', () => {
    expect(resolveNextNode(edges, 1, 3)).toBe(3)
  })
  it('2 estrellas sigue la arista 2star', () => {
    expect(resolveNextNode(edges, 1, 2)).toBe(2)
  })
  it('menos de 2 estrellas repite el nodo actual', () => {
    expect(resolveNextNode(edges, 1, 1)).toBe(1)
    expect(resolveNextNode(edges, 1, 0)).toBe(1)
  })
  it('si no hay arista para ese resultado, se queda en el nodo (fin de rama)', () => {
    expect(resolveNextNode([], 5, 3)).toBe(5)
  })
})
```

- [ ] **Step 2: Ejecutar para verificar que falla**

Run: `npm test -- story/graph`
Expected: FAIL ("Cannot find module './graph'").

- [ ] **Step 3: Implementar tipos y resolución**

Create `src/lib/story/types.ts`:
```typescript
export type Outcome = '3star' | '2star'

export interface StoryNode {
  id: number
  challengeId: number
  isStart: boolean
}

export interface StoryEdge {
  fromNode: number
  outcome: Outcome
  toNode: number
}
```

Create `src/lib/story/graph.ts`:
```typescript
import type { StoryEdge } from './types'

/**
 * Dado el nodo actual y las estrellas obtenidas, devuelve el id del siguiente nodo.
 * 3★ → arista '3star'; 2★ → arista '2star'; <2★ → repetir el nodo actual.
 * Si no existe la arista correspondiente, se permanece en el nodo (fin de rama).
 */
export function resolveNextNode(edges: StoryEdge[], currentNode: number, stars: number): number {
  if (stars < 2) return currentNode
  const outcome = stars >= 3 ? '3star' : '2star'
  const edge = edges.find((e) => e.fromNode === currentNode && e.outcome === outcome)
  return edge ? edge.toNode : currentNode
}
```

- [ ] **Step 4: Ejecutar para verificar que pasa**

Run: `npm test -- story/graph`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(b): resolución de siguiente nodo del grafo por estrellas"
```

---

### Task 7: Repositorio del grafo y journey del usuario

**Files:**
- Create: `src/lib/story/repository.ts`
- Test: `src/lib/story/repository.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Create `src/lib/story/repository.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../db/schema'
import { seedCurriculum } from '../curriculum/seed'
import { UserRepository } from '../users/repository'
import { StoryRepository } from './repository'

function setup() {
  const db = new Database(':memory:')
  createSchema(db)
  seedCurriculum(db)
  const user = new UserRepository(db).findOrCreateByUsername('ana')
  return { repo: new StoryRepository(db), userId: user.id, db }
}

describe('StoryRepository', () => {
  it('lista nodos y aristas', () => {
    const { repo } = setup()
    expect(repo.listNodes().length).toBeGreaterThanOrEqual(2)
    expect(repo.listEdges().length).toBeGreaterThanOrEqual(2)
  })

  it('el nodo actual de un usuario nuevo es el de inicio', () => {
    const { repo, userId } = setup()
    const node = repo.currentNode(userId)
    expect(node).toBeTruthy()
    expect(node!.isStart).toBe(true)
  })

  it('permite avanzar el nodo actual', () => {
    const { repo, userId } = setup()
    const nodes = repo.listNodes()
    const target = nodes[1].id
    repo.setCurrentNode(userId, target)
    expect(repo.currentNode(userId)!.id).toBe(target)
  })

  it('resuelve el reto (slug) asociado a un nodo', () => {
    const { repo } = setup()
    const start = repo.listNodes().find((n) => n.isStart)!
    expect(repo.challengeSlugForNode(start.id)).toBe('saludo')
  })
})
```

- [ ] **Step 2: Ejecutar para verificar que falla**

Run: `npm test -- story/repository`
Expected: FAIL ("Cannot find module './repository'").

- [ ] **Step 3: Implementar el repositorio**

Create `src/lib/story/repository.ts`:
```typescript
import type Database from 'better-sqlite3'
import type { StoryEdge, StoryNode } from './types'

export class StoryRepository {
  constructor(private db: Database.Database) {}

  listNodes(): StoryNode[] {
    const rows = this.db
      .prepare('SELECT id, challenge_id, is_start FROM story_nodes ORDER BY id')
      .all() as { id: number; challenge_id: number; is_start: number }[]
    return rows.map((r) => ({ id: r.id, challengeId: r.challenge_id, isStart: r.is_start === 1 }))
  }

  listEdges(): StoryEdge[] {
    const rows = this.db
      .prepare('SELECT from_node, outcome, to_node FROM story_edges')
      .all() as { from_node: number; outcome: '3star' | '2star'; to_node: number }[]
    return rows.map((r) => ({ fromNode: r.from_node, outcome: r.outcome, toNode: r.to_node }))
  }

  private startNode(): StoryNode | null {
    return this.listNodes().find((n) => n.isStart) ?? this.listNodes()[0] ?? null
  }

  /** Nodo actual del usuario; si no tiene journey, devuelve (y persiste) el de inicio. */
  currentNode(userId: number): StoryNode | null {
    const row = this.db
      .prepare('SELECT current_node FROM user_journey WHERE user_id = ?')
      .get(userId) as { current_node: number } | undefined
    if (row) {
      return this.listNodes().find((n) => n.id === row.current_node) ?? null
    }
    const start = this.startNode()
    if (start) this.setCurrentNode(userId, start.id)
    return start
  }

  setCurrentNode(userId: number, nodeId: number): void {
    this.db
      .prepare(
        `INSERT INTO user_journey (user_id, current_node) VALUES (?, ?)
         ON CONFLICT(user_id) DO UPDATE SET current_node = excluded.current_node`,
      )
      .run(userId, nodeId)
  }

  challengeSlugForNode(nodeId: number): string | null {
    const row = this.db
      .prepare(
        `SELECT c.slug AS slug FROM story_nodes n JOIN challenges c ON c.id = n.challenge_id WHERE n.id = ?`,
      )
      .get(nodeId) as { slug: string } | undefined
    return row?.slug ?? null
  }

  nodeForChallengeSlug(slug: string): StoryNode | null {
    const row = this.db
      .prepare(
        `SELECT n.id AS id, n.challenge_id AS challenge_id, n.is_start AS is_start
         FROM story_nodes n JOIN challenges c ON c.id = n.challenge_id WHERE c.slug = ?`,
      )
      .get(slug) as { id: number; challenge_id: number; is_start: number } | undefined
    return row ? { id: row.id, challengeId: row.challenge_id, isStart: row.is_start === 1 } : null
  }
}
```

- [ ] **Step 4: Ejecutar para verificar que pasa**

Run: `npm test -- story/repository`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(b): repositorio del grafo y journey del usuario"
```

---

### Task 8: Motor Python (Pyodide en Worker)

**Files:**
- Create: `src/lib/engine/python-client.ts`, `public/workers/python.worker.js`
- Test: verificación manual (Step 5) — Pyodide requiere navegador.

**Contexto:** Pyodide corre en un Web Worker. Para evitar fricción de bundling de WASM, el worker se sirve como fichero estático en `public/workers/` y carga Pyodide desde CDN con `importScripts`. Expone `print` redirigiendo `sys.stdout`, e inyecta `input` como variable Python (dict). Contrato idéntico a `runInWorker`: `runPython(code, input) → Promise<RunResult>` con timeout.

> Nota offline: si el Fab Lab no tiene internet, sustituir la URL del CDN por una copia local de Pyodide en `public/pyodide/`. Documentar en README.

- [ ] **Step 1: Crear el worker de Python**

Create `public/workers/python.worker.js`:
```javascript
/* global importScripts, loadPyodide */
importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js')

let pyodideReady = null

async function getPyodide() {
  if (!pyodideReady) {
    pyodideReady = loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/' })
  }
  return pyodideReady
}

self.onmessage = async (e) => {
  const { code, input } = e.data
  const started = Date.now()
  try {
    const py = await getPyodide()
    py.globals.set('__input__', py.toPy(input))
    const wrapped = [
      'import sys, io, json',
      '__buf__ = io.StringIO()',
      '__old__ = sys.stdout',
      'sys.stdout = __buf__',
      'input = __input__',
      'try:',
      ...code.split('\n').map((l) => '    ' + l),
      'finally:',
      '    sys.stdout = __old__',
      '__out__ = __buf__.getvalue()',
    ].join('\n')
    await py.runPythonAsync(wrapped)
    const out = py.globals.get('__out__')
    self.postMessage({ output: String(out).replace(/\n$/, ''), timeMs: Date.now() - started })
  } catch (err) {
    self.postMessage({
      output: '',
      error: 'Tu programa Python tuvo un problema: ' + (err && err.message ? err.message.split('\n').pop() : String(err)),
      timeMs: Date.now() - started,
    })
  }
}
```

- [ ] **Step 2: Crear el cliente Python**

Create `src/lib/engine/python-client.ts`:
```typescript
import type { RunResult } from './js-runner'

const TIMEOUT_MS = 15000 // Pyodide tarda en arrancar la primera vez

export function runPython(code: string, input: unknown): Promise<RunResult> {
  return new Promise((resolve) => {
    const worker = new Worker('/workers/python.worker.js')
    const timer = setTimeout(() => {
      worker.terminate()
      resolve({ output: '', error: 'Tu programa tardó demasiado.', timeMs: TIMEOUT_MS })
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
git commit -m "feat(b): motor Python con Pyodide en Web Worker"
```

- [ ] **Step 4: Verificación manual (tras Task 11)**

En la página del reto, seleccionar Python y escribir `print(input["hasta"])` en el reto `contar`; confirmar que ejecuta (la primera vez tarda unos segundos cargando Pyodide) y muestra la salida.

---

### Task 9: Motor de Bloques (Blockly → JS)

**Files:**
- Create: `src/lib/engine/blocks/toolbox.ts`, `src/app/challenge/[slug]/BlocklyEditor.tsx`
- Modify: `package.json` (dependencia `blockly`)
- Test: `src/lib/engine/blocks/toolbox.test.ts` (verifica la config del toolbox; la generación de código se valida manualmente)

**Contexto:** Blockly genera JS que se ejecuta con el mismo motor JS (`runInWorker`). Para Hito B, un toolbox mínimo: imprimir (texto y número), variables, bucle "repetir N veces" y operaciones básicas. El bloque `texto_imprimir` genera `print(...)`.

- [ ] **Step 1: Instalar Blockly**

Run: `npm install blockly`
Expected: añadido a `package.json`.

- [ ] **Step 2: Escribir el test del toolbox (falla)**

Create `src/lib/engine/blocks/toolbox.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { TOOLBOX } from './toolbox'

describe('toolbox de bloques', () => {
  it('incluye categorías básicas para principiantes', () => {
    const labels = TOOLBOX.contents.map((c) => c.name)
    expect(labels).toEqual(expect.arrayContaining(['Imprimir', 'Bucles', 'Variables', 'Matemáticas']))
  })
})
```

- [ ] **Step 3: Ejecutar para verificar que falla**

Run: `npm test -- blocks/toolbox`
Expected: FAIL ("Cannot find module './toolbox'").

- [ ] **Step 4: Implementar el toolbox**

Create `src/lib/engine/blocks/toolbox.ts`:
```typescript
export interface ToolboxCategory {
  kind: 'category'
  name: string
  contents: { kind: 'block'; type: string }[]
}

export interface Toolbox {
  kind: 'categoryToolbox'
  contents: ToolboxCategory[]
}

/** Toolbox mínimo de Hito B, en español, apto para 7-12 años. */
export const TOOLBOX: Toolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Imprimir',
      contents: [{ kind: 'block', type: 'text_print' }, { kind: 'block', type: 'text' }],
    },
    {
      kind: 'category',
      name: 'Bucles',
      contents: [{ kind: 'block', type: 'controls_repeat_ext' }, { kind: 'block', type: 'controls_for' }],
    },
    {
      kind: 'category',
      name: 'Variables',
      contents: [{ kind: 'block', type: 'variables_get' }, { kind: 'block', type: 'variables_set' }],
    },
    {
      kind: 'category',
      name: 'Matemáticas',
      contents: [{ kind: 'block', type: 'math_number' }, { kind: 'block', type: 'math_arithmetic' }],
    },
  ],
}
```

- [ ] **Step 5: Ejecutar para verificar que pasa**

Run: `npm test -- blocks/toolbox`
Expected: PASS (1 test).

- [ ] **Step 6: Implementar el editor de bloques**

Create `src/app/challenge/[slug]/BlocklyEditor.tsx`:
```tsx
'use client'
import { useEffect, useRef } from 'react'
import * as Blockly from 'blockly'
import { javascriptGenerator } from 'blockly/javascript'
import * as Es from 'blockly/msg/es'
import { TOOLBOX } from '@/lib/engine/blocks/toolbox'

Blockly.setLocale(Es as unknown as Record<string, string>)

// El bloque "imprimir" de Blockly genera window.alert; lo redefinimos a print().
javascriptGenerator.forBlock['text_print'] = function (block, generator) {
  const msg = generator.valueToCode(block, 'TEXT', 0) || "''"
  return `print(${msg});\n`
}

export function BlocklyEditor({ onCodeChange }: { onCodeChange: (code: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const workspace = Blockly.inject(ref.current, { toolbox: TOOLBOX as unknown as Blockly.utils.toolbox.ToolboxDefinition })
    const update = () => onCodeChange(javascriptGenerator.workspaceToCode(workspace))
    workspace.addChangeListener(update)
    return () => workspace.dispose()
  }, [onCodeChange])

  return <div ref={ref} style={{ height: 360, width: '100%' }} />
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(b): motor de bloques (Blockly -> JS) con toolbox básico"
```

- [ ] **Step 8: Verificación manual (tras Task 11)**

Seleccionar "Bloques" en el reto `saludo`, arrastrar un bloque imprimir con texto "Hola mundo", ejecutar y confirmar que sale "Hola mundo".

---

### Task 10: Motor unificado por lenguaje (cliente)

**Files:**
- Create: `src/lib/engine/run-any.ts`
- Test: verificación vía integración (los runners JS ya están testeados; Python/Bloques son de navegador)

**Contexto:** Un único punto de entrada para la página del reto, que despacha al motor correcto. Bloques ejecuta el JS generado con el motor JS.

- [ ] **Step 1: Implementar el despachador**

Create `src/lib/engine/run-any.ts`:
```typescript
import type { RunResult } from './js-runner'
import { runInWorker } from './client'
import { runPython } from './python-client'
import type { Language } from '../curriculum/types'

/**
 * Ejecuta el código del alumno en el motor del lenguaje indicado.
 * - js y blocks: motor JS (los bloques ya vienen compilados a JS).
 * - python: Pyodide.
 */
export function runByLanguage(language: Language, code: string, input: unknown): Promise<RunResult> {
  if (language === 'python') return runPython(code, input)
  return runInWorker(code, input) // js y blocks
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(b): despachador de ejecución por lenguaje"
```

---

### Task 11: Rutas API y página del reto con random inputs + lenguajes + grafo

**Files:**
- Modify: `src/app/api/challenges/[slug]/route.ts`, `src/app/api/challenges/[slug]/submit/route.ts`
- Modify: `src/app/challenge/[slug]/page.tsx`
- Create: `src/lib/grading/secret.ts` (helper del secreto, reusa SESSION_SECRET)

**Contexto:** Aquí se integra todo. El GET genera entradas aleatorias, firma el token y devuelve todas las variantes + lenguajes disponibles. El submit verifica el token, calcula la salida esperada con la solución de referencia, califica, registra progreso y **avanza el grafo** (reemplaza `nextChallengeSlug` lineal).

- [ ] **Step 1: Helper del secreto**

Create `src/lib/grading/secret.ts`:
```typescript
export function gradingSecret(): string {
  return process.env.SESSION_SECRET ?? 'dev-insecure-secret-change-me'
}
```

- [ ] **Step 2: Reescribir el GET del reto**

Replace `src/app/api/challenges/[slug]/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { CurriculumRepository } from '@/lib/curriculum/repository'
import { generateInputs } from '@/lib/grading/inputs'
import { signInputs } from '@/lib/grading/attempt-token'
import { gradingSecret } from '@/lib/grading/secret'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const repo = new CurriculumRepository(getDb())
  const challenge = repo.getChallengeBySlug(slug)
  if (!challenge) return NextResponse.json({ error: 'Reto no encontrado.' }, { status: 404 })

  const inputs = generateInputs(challenge.inputSpec, Math.random)
  const token = signInputs(inputs, gradingSecret())
  const languages = Object.keys(challenge.variants)

  return NextResponse.json({
    slug: challenge.slug,
    title: challenge.title,
    narrative: challenge.narrative,
    languages,
    variants: challenge.variants, // { js?, python?, blocks? }
    inputs,
    token,
  })
}
```

- [ ] **Step 3: Reescribir el submit**

Replace `src/app/api/challenges/[slug]/submit/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { CurriculumRepository } from '@/lib/curriculum/repository'
import { UserRepository } from '@/lib/users/repository'
import { ProgressRepository } from '@/lib/progress/repository'
import { StoryRepository } from '@/lib/story/repository'
import { getCurrentUser } from '@/lib/session/server'
import { verifyInputs } from '@/lib/grading/attempt-token'
import { expectedOutputs } from '@/lib/grading/reference'
import { gradeSubmission } from '@/lib/grading/grade'
import { resolveNextNode } from '@/lib/story/graph'
import { gradingSecret } from '@/lib/grading/secret'

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!user) return NextResponse.json({ error: 'No has iniciado sesión.' }, { status: 401 })

  const body = await req.json()
  const producedOutputs: string[] = Array.isArray(body.outputs) ? body.outputs.map(String) : []
  const hintsUsed = Number(body.hintsUsed ?? 0)
  const token = String(body.token ?? '')

  const inputs = verifyInputs(token, gradingSecret())
  if (!inputs) return NextResponse.json({ error: 'Token de intento inválido.' }, { status: 400 })

  const curriculum = new CurriculumRepository(db)
  const challenge = curriculum.getChallengeBySlug(slug)
  if (!challenge) return NextResponse.json({ error: 'Reto no encontrado.' }, { status: 404 })

  // Salida esperada calculada al vuelo con la solución de referencia del autor.
  const expected = expectedOutputs(challenge.referenceSolution, inputs)
  const testCases = inputs.map((input, i) => ({ input, expectedOutput: expected[i] }))

  const progress = new ProgressRepository(db)
  const prev = progress.get(user.id, challenge.id)
  const attempts = (prev?.attempts ?? 0) + 1

  const { correct, stars } = gradeSubmission({ producedOutputs, testCases, attempts, hintsUsed })
  progress.recordAttempt(user.id, challenge.id, { stars, hintsUsed, completed: correct })

  // Avanzar el grafo desde el nodo de este reto.
  const story = new StoryRepository(db)
  const node = story.nodeForChallengeSlug(slug)
  let nextSlug: string | null = null
  if (node) {
    const nextNodeId = correct ? resolveNextNode(story.listEdges(), node.id, stars) : node.id
    story.setCurrentNode(user.id, nextNodeId)
    nextSlug = story.challengeSlugForNode(nextNodeId)
  }

  return NextResponse.json({ correct, stars, next: nextSlug, repeat: nextSlug === slug })
}
```

- [ ] **Step 4: Reescribir la página del reto (selector de lenguaje + Bloques)**

Replace `src/app/challenge/[slug]/page.tsx`:
```tsx
'use client'
import { useEffect, useState, use } from 'react'
import { runByLanguage } from '@/lib/engine/run-any'
import { BlocklyEditor } from './BlocklyEditor'
import type { Language } from '@/lib/curriculum/types'

interface Variant { statement: string; starterCode: string; hints: string[] }
interface ChallengeData {
  slug: string
  title: string
  narrative: string
  languages: Language[]
  variants: Partial<Record<Language, Variant>>
  inputs: unknown[]
  token: string
}

export default function ChallengePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [data, setData] = useState<ChallengeData | null>(null)
  const [language, setLanguage] = useState<Language>('js')
  const [code, setCode] = useState('')
  const [consoleOut, setConsoleOut] = useState('')
  const [result, setResult] = useState<{ correct: boolean; stars: number; next: string | null } | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)

  useEffect(() => {
    fetch(`/api/challenges/${slug}`)
      .then((r) => r.json())
      .then((d: ChallengeData) => {
        setData(d)
        const first = (d.languages[0] ?? 'js') as Language
        setLanguage(first)
        setCode(d.variants[first]?.starterCode ?? '')
      })
  }, [slug])

  if (!data) return <main>Cargando…</main>
  const variant = data.variants[language]

  function pickLanguage(lang: Language) {
    setLanguage(lang)
    setCode(data!.variants[lang]?.starterCode ?? '')
    setConsoleOut('')
  }

  async function run() {
    const res = await runByLanguage(language, code, data!.inputs[0])
    setConsoleOut(res.error ? res.error : res.output)
  }

  async function submit() {
    const outputs: string[] = []
    for (const input of data!.inputs) {
      const res = await runByLanguage(language, code, input)
      outputs.push(res.error ? '' : res.output)
    }
    const res = await fetch(`/api/challenges/${slug}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputs, hintsUsed, token: data!.token, language }),
    })
    setResult(await res.json())
  }

  return (
    <main>
      <h1>{data.title}</h1>
      <p>{data.narrative}</p>
      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        {data.languages.map((lang) => (
          <button key={lang} onClick={() => pickLanguage(lang)} disabled={lang === language}>
            {lang === 'js' ? 'JavaScript' : lang === 'python' ? 'Python' : 'Bloques'}
          </button>
        ))}
      </div>
      {variant && <p><strong>{variant.statement}</strong></p>}
      {language === 'blocks' ? (
        <BlocklyEditor onCodeChange={setCode} />
      ) : (
        <textarea value={code} onChange={(e) => setCode(e.target.value)} rows={10} />
      )}
      <div style={{ marginTop: 8 }}>
        <button onClick={run}>Ejecutar</button>{' '}
        <button onClick={submit}>Enviar</button>{' '}
        {variant && variant.hints.length > 0 && (
          <button onClick={() => { setHintsUsed((n) => n + 1); alert(variant.hints[0]) }}>Pista</button>
        )}
      </div>
      <pre>{consoleOut}</pre>
      {result && (
        <p>
          {result.correct ? `¡Correcto! ${'★'.repeat(result.stars)}` : 'Aún no es correcto, ¡prueba otra vez!'}
          {result.next && result.next !== slug && (
            <> · <a href={`/challenge/${result.next}`}>siguiente reto →</a></>
          )}
        </p>
      )}
    </main>
  )
}
```

- [ ] **Step 5: Verificar que no se rompen los tests**

Run: `npm test`
Expected: PASS. (Nota: el viejo test que comprobaba que el GET excluía `expectedOutput` ya no aplica porque ya no usamos `test_cases` en el GET; si existe un test así del Hito A en `route`-nivel, no lo hay — las rutas no tenían tests. Verifica que ningún test importe la firma vieja de la página.)

- [ ] **Step 6: Verificación manual de extremo a extremo**

Run: `npm run dev` (borra `data.sqlite` antes para resembrar: `rm -f data.sqlite*`)
1. Login, abre `contar`. Cambia entre JS / Python / Bloques.
2. Resuélvelo en JS con un bucle → correcto, estrellas, enlace a "siguiente reto".
3. Recarga el reto y mira el número en el enunciado: cambia entre cargas (entrada aleatoria).
4. Intenta hacer trampa imprimiendo a mano: imposible porque el número cambia y es grande.
5. Resuélvelo en Python (`for i in range(1, input["hasta"]+1): print("Hola "+str(i))`).
6. En `saludo`, prueba Bloques: arrastra imprimir "Hola mundo".

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(b): integración de entradas aleatorias, 3 lenguajes y avance por grafo"
```

---

### Task 12: API y página del árbol de aprendizaje

**Files:**
- Create: `src/app/api/journey/route.ts`, `src/app/tree/page.tsx`
- Modify: `src/app/page.tsx`
- Test: `src/lib/story/view.test.ts` (lógica de construcción de la vista, pura)
- Create: `src/lib/story/view.ts`

**Contexto:** El árbol muestra nodos, aristas, el nodo actual del usuario y los completados. Separamos la **construcción de la vista** (pura, testeable) del render.

- [ ] **Step 1: Test de la vista (falla)**

Create `src/lib/story/view.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { buildTreeView } from './view'
import type { StoryNode, StoryEdge } from './types'

const nodes: StoryNode[] = [
  { id: 1, challengeId: 10, isStart: true },
  { id: 2, challengeId: 11, isStart: false },
]
const edges: StoryEdge[] = [{ fromNode: 1, outcome: '3star', toNode: 2 }]

describe('buildTreeView', () => {
  it('marca el nodo actual y los completados', () => {
    const view = buildTreeView({
      nodes,
      edges,
      currentNodeId: 2,
      completedChallengeIds: [10],
      slugByChallengeId: { 10: 'saludo', 11: 'contar' },
      titleByChallengeId: { 10: 'Saludo', 11: 'Contar' },
    })
    const a = view.nodes.find((n) => n.id === 1)!
    const b = view.nodes.find((n) => n.id === 2)!
    expect(a.completed).toBe(true)
    expect(a.current).toBe(false)
    expect(b.current).toBe(true)
    expect(b.slug).toBe('contar')
    expect(b.title).toBe('Contar')
  })
})
```

- [ ] **Step 2: Ejecutar para verificar que falla**

Run: `npm test -- story/view`
Expected: FAIL ("Cannot find module './view'").

- [ ] **Step 3: Implementar la vista**

Create `src/lib/story/view.ts`:
```typescript
import type { StoryEdge, StoryNode } from './types'

export interface TreeViewNode {
  id: number
  slug: string
  title: string
  current: boolean
  completed: boolean
  isStart: boolean
}

export interface TreeView {
  nodes: TreeViewNode[]
  edges: StoryEdge[]
}

export function buildTreeView(args: {
  nodes: StoryNode[]
  edges: StoryEdge[]
  currentNodeId: number | null
  completedChallengeIds: number[]
  slugByChallengeId: Record<number, string>
  titleByChallengeId: Record<number, string>
}): TreeView {
  const done = new Set(args.completedChallengeIds)
  return {
    edges: args.edges,
    nodes: args.nodes.map((n) => ({
      id: n.id,
      slug: args.slugByChallengeId[n.challengeId] ?? '',
      title: args.titleByChallengeId[n.challengeId] ?? '',
      current: n.id === args.currentNodeId,
      completed: done.has(n.challengeId),
      isStart: n.isStart,
    })),
  }
}
```

- [ ] **Step 4: Ejecutar para verificar que pasa**

Run: `npm test -- story/view`
Expected: PASS (1 test).

- [ ] **Step 5: Implementar la API del journey**

Create `src/app/api/journey/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'
import { UserRepository } from '@/lib/users/repository'
import { ProgressRepository } from '@/lib/progress/repository'
import { StoryRepository } from '@/lib/story/repository'
import { CurriculumRepository } from '@/lib/curriculum/repository'
import { getCurrentUser } from '@/lib/session/server'
import { buildTreeView } from '@/lib/story/view'

export async function GET() {
  const db = getDb()
  const user = await getCurrentUser(new UserRepository(db))
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const story = new StoryRepository(db)
  const curriculum = new CurriculumRepository(db)
  const progress = new ProgressRepository(db)

  const slugByChallengeId: Record<number, string> = {}
  const titleByChallengeId: Record<number, string> = {}
  for (const c of curriculum.listChallenges()) {
    slugByChallengeId[c.id] = c.slug
    titleByChallengeId[c.id] = c.title
  }

  const view = buildTreeView({
    nodes: story.listNodes(),
    edges: story.listEdges(),
    currentNodeId: story.currentNode(user.id)?.id ?? null,
    completedChallengeIds: progress.completedChallengeIds(user.id),
    slugByChallengeId,
    titleByChallengeId,
  })
  return NextResponse.json(view)
}
```

> Nota: `CurriculumRepository.listChallenges()` devuelve `{id, slug, title, ord}`. Si tu versión no incluye `id`, ya lo hace (Hito A lo devuelve). No cambies su firma.

- [ ] **Step 6: Implementar la página del árbol**

Create `src/app/tree/page.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import type { TreeView } from '@/lib/story/view'

export default function TreePage() {
  const [view, setView] = useState<TreeView | null>(null)
  useEffect(() => {
    fetch('/api/journey').then((r) => r.json()).then(setView)
  }, [])
  if (!view) return <main>Cargando árbol…</main>

  return (
    <main>
      <h1>Tu camino de aprendizaje</h1>
      <ol>
        {view.nodes.map((n) => (
          <li key={n.id} style={{ borderColor: n.current ? '#5b8cff' : undefined }}>
            {n.completed ? '✓ ' : n.current ? '➜ ' : '○ '}
            <a href={`/challenge/${n.slug}`}>{n.title || n.slug}</a>
            {n.isStart && <span style={{ color: '#9aa1ad' }}> · inicio</span>}
            {n.current && <strong style={{ color: '#5b8cff' }}> · estás aquí</strong>}
          </li>
        ))}
      </ol>
    </main>
  )
}
```

> Nota: es una vista de lista anotada (no un grafo dibujado). El render gráfico del árbol (líneas entre nodos) puede abordarse junto a la estética en su hito; este Step cumple "ver de dónde parte, dónde está y el camino".

- [ ] **Step 7: Enlazar desde el home**

En `src/app/page.tsx`, añade un enlace al árbol en el header (junto a "Mi perfil"):
```tsx
        <Link href="/tree">Mi camino</Link>
```

- [ ] **Step 8: Ejecutar toda la batería**

Run: `npm test`
Expected: PASS.

- [ ] **Step 9: Verificación manual**

Run: `npm run dev`
Abrir `/tree`: ver los nodos, el actual marcado ("estás aquí"), completar un reto y comprobar que el actual avanza.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(b): API y vista del árbol de aprendizaje"
```

---

## Self-Review (cobertura del spec — Hito B)

- 3 motores en el navegador (JS ya en A; **Python** → Task 8; **Bloques** → Task 9; despachador → Task 10; integración en la página → Task 11).
- Entradas aleatorias por intento → generador (Task 2) + token firmado (Task 4) + integración GET/submit (Task 11).
- Solución de referencia del autor calcula la salida esperada en servidor → Task 3 + Task 5 (datos) + Task 11 (uso).
- Anti-trampa total (no se puede copiar ni precalcular) → entradas aleatorias + esperado solo en servidor (Tasks 3, 4, 11).
- Grafo "elige tu propia aventura" con aristas por estrellas → resolución pura (Task 6) + repo/journey (Task 7) + seed del grafo (Task 5) + avance en submit (Task 11).
- Visualización del árbol (de dónde parte, dónde está, camino) → vista pura (Task 12) + API + página (Task 12).
- Estrellas → ya en Hito A (reutilizadas).

**Riesgos / notas:**
- Pyodide se carga desde CDN; para Fab Lab offline, self-hostear en `public/pyodide/` (documentar).
- La migración de esquema añade columnas con `addColumnIfMissing`; si la BD local del Hito A ya existe, conserva datos. Para resembrar el currículo nuevo hay que borrar `data.sqlite` (el seed solo corre si la tabla `challenges` está vacía).
- Ejecutar la solución de referencia en el servidor es ejecución de código, pero **solo de autores (admins)**, acotada con `vm` + timeout. El código del alumno sigue sin tocar el servidor.

Fuera de este hito (Hitos C–D): apelaciones con límites, panel de admin completo (analítica, edición de contenido/grafo, cola de revisión), estética definitiva, plataforma online.
