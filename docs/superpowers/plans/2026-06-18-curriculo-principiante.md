# Currículo para principiantes — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescribir el currículo (`seed.ts`) con una rampa muy suave para principiantes absolutos (sin `input` al principio), introducir `input` como tema propio, y añadir 3 mini-proyectos avanzados. Pasa de 16 a 28 lecciones.

**Architecture:** Es un cambio de **solo datos**: todo vive en `src/lib/curriculum/seed.ts`. No se toca la UI ni el motor de ejecución. Se añade un test de verificación (`seed-solutions.test.ts`) que ejecuta la solución de referencia JS de cada reto contra sus casos de prueba usando `runJs`, garantizando que las salidas esperadas son correctas.

**Tech Stack:** TypeScript, better-sqlite3 (DB en memoria para tests), vitest, el runner `runJs` de `src/lib/engine/js-runner.ts`.

## Global Constraints

Estas reglas aplican a TODAS las tareas:

- **Formato de salida:** la salida de un programa es `lines.join('\n')` — **sin salto de línea final**. Los `expected_output` de los `tc(...)` deben seguir ese formato.
- **Números sin comillas:** `print(7)` imprime `7`. En JS, `"texto" + 7` convierte el número a texto automáticamente; en Python NO (usar f-strings).
- **División y decimales:** en JS `20 / 4` da `5`; en Python `20 / 4` da `5.0`. Como el `expected_output` es **compartido** entre variantes, NINGÚN reto nuevo usa división. Se usan solo `+`, `-`, `*`.
- **Bloques:** las variantes de Bloques solo pueden usar piezas presentes en `src/lib/engine/blocks/toolbox.ts`: `text_print`, `text`, `text_join`, `input_get`, `math_number`, `math_arithmetic`, `math_modulo`, `controls_if`, `logic_compare`, `logic_operation`, `logic_boolean`, `controls_repeat_ext`, `controls_for`, `variables_get`, `variables_set`, y `PROCEDURE` (funciones). **No hay bloques de listas ni de texto avanzado** (longitud, carácter). Las lecciones que necesiten listas o manipulación de texto se quedan **sin variante de Bloques** (igual que los retos actuales `invertir`, `contar-pares`, `suma-rango`, `tabla-multiplicar`).
- **Formato de enunciado:** mantener el estilo actual: `👉` introduce la pista de código; `🧩` introduce la guía de bloques; los retos avanzados empiezan con `Reto experto 🧠`.
- **`ord` es por concepto:** cada concepto empieza en `ord = 0` para sus retos. Los conceptos se ordenan con su propio `ord` (0..6).
- **Acentos y signos:** usar UTF-8 normal (`más`, `adiós`, `¿Qué tal?`, `¡acertaste!`).
- **Casos de prueba:** mínimo 2 por reto nuevo (cuando sea posible), cubriendo caso normal y algún borde.

**Estructura final (7 conceptos, 28 retos):**

| ord | concepto (slug) | retos (slug, en orden) |
|-----|-----------------|------------------------|
| 0 | `primeros-pasos` | saludo, varias-lineas🆕, imprimir-numeros🆕, primera-cuenta🆕, operaciones🆕 |
| 1 | `variables` | guardar-numero🆕, mi-nombre, caja-cuenta🆕, juntar-textos🆕 |
| 2 | `datos-input` | que-es-input🆕, suma, doble |
| 3 | `condicionales` | si-o-no🆕, par-impar, signo, mayor-dos, fizzbuzz |
| 4 | `bucles` | contar, suma-rango, tabla-multiplicar, invertir, contar-pares |
| 5 | `funciones` | funcion-saludo, potencia, es-primo |
| 6 | `proyectos` | calculadora🆕, validador-contrasena🆕, adivina-numero🆕 |

> **Nota de proceso sobre tests estructurales:** `src/lib/curriculum/repository.test.ts` (y posibles tests que cuenten conceptos) afirman la estructura vieja (4 conceptos). Quedarán **temporalmente en ROJO** desde la Tarea 2 hasta la Tarea 9, donde se actualizan. Durante las Tareas 2-8 el **gate es `seed-solutions.test.ts`** (debe estar siempre verde). No "arregles" `repository.test.ts` a mitad: se hace en la Tarea 9.

---

### Task 1: Arnés de verificación (red de seguridad sobre el currículo actual)

Crea un test que ejecuta la solución de referencia JS de cada reto contra sus casos de prueba. Empieza cubriendo los retos EXISTENTES para validar el mecanismo y dejar una base verde.

**Files:**
- Create: `src/lib/curriculum/seed-solutions.test.ts`

**Interfaces:**
- Consumes: `seedCurriculum(db)` de `./seed`, `createSchema(db)` de `../db/schema`, `CurriculumRepository` de `./repository`, `runJs(code, input)` de `../engine/js-runner` (devuelve `{ output: string }`).
- Produces: una constante `SOLUTIONS: Record<string, string>` (slug → código JS de referencia) que tareas posteriores ampliarán.

- [ ] **Step 1: Escribe el test con las soluciones de los retos existentes**

```ts
import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../db/schema'
import { seedCurriculum } from './seed'
import { CurriculumRepository } from './repository'
import { runJs } from '../engine/js-runner'

// slug -> solución JS de referencia. Se amplía en tareas posteriores.
const SOLUTIONS: Record<string, string> = {
  saludo: 'print("Hola mundo")',
  'mi-nombre': 'let nombre = "Mundo"\nprint("Hola, " + nombre)',
  suma: 'print(input.a + input.b)',
  doble: 'print(input.n * 2)',
  contar: 'for (let i = 1; i <= input.hasta; i++) {\n  print("Hola " + i)\n}',
  'par-impar': 'if (input.n % 2 === 0) {\n  print("par")\n} else {\n  print("impar")\n}',
  signo: 'if (input.n > 0) {\n  print("positivo")\n} else if (input.n < 0) {\n  print("negativo")\n} else {\n  print("cero")\n}',
  'mayor-dos': 'if (input.a >= input.b) {\n  print(input.a)\n} else {\n  print(input.b)\n}',
  fizzbuzz:
    'for (let i = 1; i <= input.hasta; i++) {\n  if (i % 15 === 0) print("FizzBuzz")\n  else if (i % 3 === 0) print("Fizz")\n  else if (i % 5 === 0) print("Buzz")\n  else print(i)\n}',
  'suma-rango': 'let suma = 0\nfor (let i = 1; i <= input.n; i++) {\n  suma = suma + i\n}\nprint(suma)',
  'tabla-multiplicar':
    'for (let i = 1; i <= 10; i++) {\n  print(input.n + " x " + i + " = " + (input.n * i))\n}',
  invertir: 'for (let i = input.items.length - 1; i >= 0; i--) {\n  print(input.items[i])\n}',
  'contar-pares':
    'for (let i = 0; i < input.items.length; i++) {\n  if (input.items[i] % 2 === 0) {\n    print(input.items[i])\n  }\n}',
  'funcion-saludo':
    'function saludar(nombre) {\n  return "Hola, " + nombre + "!"\n}\nprint(saludar(input.nombre))',
  potencia:
    'function potencia(base, exp) {\n  let r = 1\n  for (let i = 0; i < exp; i++) { r = r * base }\n  return r\n}\nprint(potencia(input.base, input.exp))',
  'es-primo':
    'function esPrimo(n) {\n  if (n < 2) return false\n  for (let i = 2; i * i <= n; i++) {\n    if (n % i === 0) return false\n  }\n  return true\n}\nprint(esPrimo(input.n) ? "primo" : "no primo")',
}

function seededRepo() {
  const db = new Database(':memory:')
  createSchema(db)
  seedCurriculum(db)
  return new CurriculumRepository(db)
}

describe('soluciones de referencia producen la salida esperada', () => {
  const repo = seededRepo()
  for (const [slug, code] of Object.entries(SOLUTIONS)) {
    it(`${slug}: la solución JS pasa todos sus casos`, () => {
      const ch = repo.getChallengeBySlug(slug)
      expect(ch, `el reto "${slug}" debe existir en el seed`).not.toBeNull()
      for (const t of ch!.testCases) {
        const { output, error } = runJs(code, t.input)
        expect(error, `error ejecutando ${slug}`).toBeUndefined()
        expect(output).toBe(t.expectedOutput)
      }
    })
  }
})
```

- [ ] **Step 2: Ejecuta y verifica que pasa**

Run: `npm test -- seed-solutions`
Expected: PASS (todos los retos existentes verdes). Si alguno falla, corrige la solución de referencia en `SOLUTIONS` hasta que coincida con el `expected_output` actual del seed.

- [ ] **Step 3: Commit**

```bash
git add src/lib/curriculum/seed-solutions.test.ts
git commit -m "test(curriculum): arnés que valida soluciones de referencia vs casos de prueba"
```

---

### Task 2: Reestructurar en 7 conceptos y subir SEED_VERSION

Reorganiza `seedAll` para crear los 7 conceptos y reasignar los 16 retos existentes a su concepto y `ord` finales (sin añadir lecciones nuevas todavía). Sube `SEED_VERSION`.

**Files:**
- Modify: `src/lib/curriculum/seed.ts`

**Interfaces:**
- Consumes: helpers `concept()`, `challenge()`, `variant()`, `tc()` (sin cambios de firma).
- Produces: conceptos con slugs `primeros-pasos`, `variables`, `datos-input`, `condicionales`, `bucles`, `funciones`, `proyectos`.

- [ ] **Step 1: Sube `SEED_VERSION`**

En `src/lib/curriculum/seed.ts`, cambia:

```ts
const SEED_VERSION = 5
```

por:

```ts
const SEED_VERSION = 6
```

- [ ] **Step 2: Reescribe la cabecera de conceptos y reasigna los retos existentes**

Reorganiza `seedAll` para que declare los 7 conceptos en este orden y mueva los retos existentes:

- Crea `primeros-pasos` (ord 0). Deja `saludo` con `ord 0` dentro de él (el resto de huecos los rellena la Tarea 3).
- Crea `variables` (ord 1). Mueve `mi-nombre` aquí con `ord 1` (huecos 0/2/3 → Tarea 4).
- Crea `datos-input` (ord 2). Mueve `suma` (`ord 1`) y `doble` (`ord 2`) aquí (hueco 0 → Tarea 5).
- Crea `condicionales` (ord 3). Mueve `par-impar`→ord 1, `signo`→2, `mayor-dos`→3, `fizzbuzz`→4 (hueco 0 → Tarea 6).
- Crea `bucles` (ord 4) con `contar`(0), `suma-rango`(1), `tabla-multiplicar`(2), `invertir`(3), `contar-pares`(4).
- Crea `funciones` (ord 5) con `funcion-saludo`(0), `potencia`(1), `es-primo`(2).
- Crea `proyectos` (ord 6) **vacío** por ahora (se llena en Tareas 7-8).

Mantén el `narrative`, `variant(...)` y `tc(...)` de cada reto existente **idénticos**; solo cambian el concepto al que pertenecen y su `ord`. Las descripciones de conceptos:

```ts
const paso = concept(db, 'primeros-pasos', 'Primeros pasos', 'Tus primeras órdenes: imprimir y calcular', 0)
const vars = concept(db, 'variables', 'Cajas para guardar', 'Guarda valores en variables y úsalos', 1)
const datos = concept(db, 'datos-input', 'Datos que llegan', 'Programas que reciben información de fuera', 2)
const cond = concept(db, 'condicionales', 'Decisiones', 'Toma decisiones con if / else', 3)
const loops = concept(db, 'bucles', 'Bucles', 'Repite acciones de forma eficiente', 4)
const funcs = concept(db, 'funciones', 'Funciones', 'Organiza tu código en bloques reutilizables', 5)
const proyectos = concept(db, 'proyectos', 'Mini-proyectos', 'Combina todo lo aprendido', 6)
```

- [ ] **Step 3: Verifica que compila y el arnés sigue verde**

Run: `npm test -- seed-solutions`
Expected: PASS (las soluciones existentes no cambian). Si falla por un slug no encontrado, revisa que ese reto siga existiendo tras la reasignación.

> `repository.test.ts` quedará en ROJO a partir de aquí (espera 4 conceptos). Es lo previsto; se arregla en la Tarea 9.

- [ ] **Step 4: Commit**

```bash
git add src/lib/curriculum/seed.ts
git commit -m "refactor(curriculum): 7 conceptos y nuevo orden; SEED_VERSION 6"
```

---

### Task 3: Concepto 0 — nuevas lecciones de "Primeros pasos"

Añade 4 retos nuevos al concepto `primeros-pasos` (ord 1-4).

**Files:**
- Modify: `src/lib/curriculum/seed.ts`
- Modify: `src/lib/curriculum/seed-solutions.test.ts`

**Interfaces:**
- Consumes: el id de concepto `paso` (de la Tarea 2).

- [ ] **Step 1: Añade primero las entradas al arnés (TDD)**

En `SOLUTIONS` de `seed-solutions.test.ts`, añade:

```ts
  'varias-lineas': 'print("Hola")\nprint("me llamo Robot")\nprint("adiós")',
  'imprimir-numeros': 'print(7)',
  'primera-cuenta': 'print(2 + 3)',
  operaciones: 'print(10 - 4)\nprint(3 * 5)',
```

- [ ] **Step 2: Ejecuta y verifica que FALLA**

Run: `npm test -- seed-solutions`
Expected: FAIL — los nuevos slugs no existen aún (`el reto "varias-lineas" debe existir en el seed`).

- [ ] **Step 3: Añade los 4 retos al seed**

Dentro del concepto `paso`, después de `saludo`, añade:

```ts
const p2 = challenge(db, paso, 'varias-lineas', 'Línea a línea', 'Cada vez que usas la orden imprimir, el ordenador escribe una línea nueva. Si pones varias órdenes imprimir, una debajo de otra, saldrán en líneas separadas. ¡Escribamos tres líneas!', 1)
variant(db, p2, 'js', 'Muestra estas tres líneas, una debajo de otra:\nHola\nme llamo Robot\nadiós\n\n👉 Usa print("...") tres veces, una por línea.', 'print("...")\nprint("...")\nprint("...")', ['Cada print escribe su propia línea.', 'Copia el texto tal cual: "Hola", luego "me llamo Robot", luego "adiós".', 'Cuida las mayúsculas y los espacios.'])
variant(db, p2, 'python', 'Muestra estas tres líneas, una debajo de otra:\nHola\nme llamo Robot\nadiós\n\n👉 Usa print("...") tres veces, una por línea.', 'print("...")\nprint("...")\nprint("...")', ['Cada print escribe su propia línea.', 'Copia el texto tal cual: "Hola", luego "me llamo Robot", luego "adiós".', 'Cuida las mayúsculas y los espacios.'])
variant(db, p2, 'blocks', 'Haz que la pantalla muestre, en tres líneas: Hola / me llamo Robot / adiós\n\n🧩 Necesitas 3 bloques «imprimir» (categoría Imprimir), cada uno con su bloque de texto « " " » dentro.', '', ['Arrastra 3 bloques «imprimir» y apílalos uno debajo de otro.', 'En cada uno mete un bloque de texto « " " ».', 'Escribe Hola, me llamo Robot y adiós (uno en cada bloque).'])
tc(db, p2, null, 'Hola\nme llamo Robot\nadiós', 0)

const p3 = challenge(db, paso, 'imprimir-numeros', 'Números en pantalla', 'Los textos van entre comillas, pero los NÚMEROS no las necesitan. Si escribes un número sin comillas, el ordenador lo entiende como una cantidad (con la que luego podrá hacer cuentas). ¡Muestra un número!', 2)
variant(db, p3, 'js', 'Muestra en pantalla el número 7 (sin comillas).\n\n👉 print(7) escribe el número 7. Fíjate: NO lleva comillas.', 'print(...)', ['Los números van SIN comillas: print(7), no print("7").', 'Escribe exactamente el 7.', 'Debe salir solo: 7'])
variant(db, p3, 'python', 'Muestra en pantalla el número 7 (sin comillas).\n\n👉 print(7) escribe el número 7. Fíjate: NO lleva comillas.', 'print(...)', ['Los números van SIN comillas: print(7), no print("7").', 'Escribe exactamente el 7.', 'Debe salir solo: 7'])
variant(db, p3, 'blocks', 'Muestra el número 7.\n\n🧩 En «Imprimir» coge «imprimir»; dentro, en vez del bloque de texto, mete el bloque de número (el «123» de «Matemáticas») y escribe 7.', '', ['Arrastra «imprimir».', 'De «Matemáticas» coge el bloque de número y escribe 7.', 'Encaja el número dentro del hueco de «imprimir».'])
tc(db, p3, null, '7', 0)

const p4 = challenge(db, paso, 'primera-cuenta', 'Tu primera cuenta', 'El ordenador es una calculadora rapidísima. Si le das una suma, primero la resuelve y luego muestra el resultado. El signo + suma dos números. ¡Que calcule por ti!', 3)
variant(db, p4, 'js', 'Muestra el resultado de sumar 2 + 3.\n\n👉 print(2 + 3) primero suma (da 5) y luego lo muestra. ¡Tú no escribes el 5, lo calcula el ordenador!', 'print(... + ...)', ['El signo + suma: 2 + 3.', 'No escribas el resultado tú; deja que el ordenador lo calcule: print(2 + 3).', 'Debe salir 5.'])
variant(db, p4, 'python', 'Muestra el resultado de sumar 2 + 3.\n\n👉 print(2 + 3) primero suma (da 5) y luego lo muestra. ¡Tú no escribes el 5, lo calcula el ordenador!', 'print(... + ...)', ['El signo + suma: 2 + 3.', 'No escribas el resultado tú; deja que el ordenador lo calcule: print(2 + 3).', 'Debe salir 5.'])
variant(db, p4, 'blocks', 'Muestra el resultado de 2 + 3.\n\n🧩 En «Matemáticas» coge el bloque de operación (deja el signo en +) y mete un número 2 y un número 3. Encájalo dentro de «imprimir».', '', ['De «Matemáticas» coge el bloque azul de operación con el signo +.', 'Pon un número 2 en un hueco y un 3 en el otro.', 'Mete esa operación dentro de «imprimir».'])
tc(db, p4, null, '5', 0)

const p5 = challenge(db, paso, 'operaciones', 'Restar y multiplicar', 'Además de sumar, puedes restar con el signo − y multiplicar con * (un asterisco, no la letra x). Vamos a mostrar dos resultados, cada uno en su línea.', 4)
variant(db, p5, 'js', 'Muestra, cada una en su línea, el resultado de:\n10 - 4\n3 * 5\n\n👉 Restar es - y multiplicar es * (asterisco). Usa un print por cada cuenta.', 'print(... - ...)\nprint(... * ...)', ['Multiplicar se escribe con * (asterisco), no con la x.', 'Un print por línea: primero 10 - 4, luego 3 * 5.', 'Deben salir 6 y 15.'])
variant(db, p5, 'python', 'Muestra, cada una en su línea, el resultado de:\n10 - 4\n3 * 5\n\n👉 Restar es - y multiplicar es * (asterisco). Usa un print por cada cuenta.', 'print(... - ...)\nprint(... * ...)', ['Multiplicar se escribe con * (asterisco), no con la x.', 'Un print por línea: primero 10 - 4, luego 3 * 5.', 'Deben salir 6 y 15.'])
variant(db, p5, 'blocks', 'Muestra en dos líneas: 10 − 4 y 3 × 5.\n\n🧩 Usa dos «imprimir». En cada uno, un bloque de operación de «Matemáticas»: en el primero elige el signo − (menos) con 10 y 4; en el segundo elige × (por) con 3 y 5.', '', ['Coge el bloque de operación de «Matemáticas» y abre su menú para elegir el signo.', 'Primer imprimir: 10 − 4. Segundo imprimir: 3 × 5.', 'En código la x de multiplicar es *, pero en bloques eliges × en el menú.'])
tc(db, p5, null, '6\n15', 0)
```

- [ ] **Step 4: Ejecuta y verifica que pasa**

Run: `npm test -- seed-solutions`
Expected: PASS (incluidos `varias-lineas`, `imprimir-numeros`, `primera-cuenta`, `operaciones`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/curriculum/seed.ts src/lib/curriculum/seed-solutions.test.ts
git commit -m "feat(curriculum): lecciones de Primeros pasos (imprimir y calcular)"
```

---

### Task 4: Concepto 1 — nuevas lecciones de "Cajas (variables)"

Añade 3 retos nuevos al concepto `variables` (ord 0, 2, 3). `mi-nombre` ya está en ord 1 desde la Tarea 2.

**Files:**
- Modify: `src/lib/curriculum/seed.ts`
- Modify: `src/lib/curriculum/seed-solutions.test.ts`

- [ ] **Step 1: Añade entradas al arnés (TDD)**

```ts
  'guardar-numero': 'let edad = 10\nprint(edad)',
  'caja-cuenta': 'let a = 5\nlet b = 3\nprint(a + b)',
  'juntar-textos': 'let nombre = "Lia"\nprint("Hola, " + nombre + ". ¿Qué tal?")',
```

- [ ] **Step 2: Ejecuta y verifica que FALLA**

Run: `npm test -- seed-solutions`
Expected: FAIL — los nuevos slugs no existen aún.

- [ ] **Step 3: Añade los 3 retos al seed**

En el concepto `vars`, con `mi-nombre` en `ord 1`, añade `guardar-numero` (ord 0, ANTES de mi-nombre), y `caja-cuenta` (2) y `juntar-textos` (3) después:

```ts
const v1 = challenge(db, vars, 'guardar-numero', 'Una caja con un número', 'Ya sabes que una VARIABLE es una caja con nombre. Antes guardamos texto; ahora vamos a guardar un NÚMERO (sin comillas). Después podrás mostrar lo que hay dentro solo con escribir el nombre de la caja.', 0)
variant(db, v1, 'js', 'Crea una caja llamada edad que valga 10 y muéstrala.\n\n👉 let edad = 10 guarda el número. print(edad) muestra lo que hay dentro (10).', 'let edad = ...\nprint(edad)', ['Los números van sin comillas: let edad = 10.', 'Muestra la caja por su nombre: print(edad).', 'No escribas print(10); usa la caja: print(edad). Debe salir 10.'])
variant(db, v1, 'python', 'Crea una caja llamada edad que valga 10 y muéstrala.\n\n👉 edad = 10 guarda el número. print(edad) muestra lo que hay dentro (10).', 'edad = ...\nprint(edad)', ['Los números van sin comillas: edad = 10.', 'Muestra la caja por su nombre: print(edad).', 'No escribas print(10); usa la caja: print(edad). Debe salir 10.'])
variant(db, v1, 'blocks', 'Guarda el número 10 en una caja llamada edad y muéstrala.\n\n🧩 En «Variables» pulsa «Crear variable…» y llámala edad. Usa «poner [edad] a» con un número 10 (de «Matemáticas»). Luego «imprimir» con el bloque verde «[edad]».', '', ['Crea la variable edad en «Variables».', 'Usa «poner edad a» y mete un número 10.', 'Mete el bloque «edad» dentro de «imprimir».'])
tc(db, v1, null, '10', 0)

// ... aquí va el reto existente mi-nombre (ord 1, sin cambios) ...

const v3 = challenge(db, vars, 'caja-cuenta', 'Cuentas con cajas', 'Lo bueno de las cajas es que puedes hacer cuentas con ellas igual que con números. Si en una caja hay un 5 y en otra un 3, sumarlas da 8. Vamos a guardar dos números y mostrar su suma.', 2)
variant(db, v3, 'js', 'Crea dos cajas: a con 5 y b con 3. Muestra su suma.\n\n👉 Guarda los dos números y luego suma las cajas: print(a + b).', 'let a = ...\nlet b = ...\nprint(a + b)', ['Crea las dos cajas: let a = 5 y let b = 3.', 'Suma las cajas por su nombre: a + b.', 'Muestra el resultado con print(a + b). Debe salir 8.'])
variant(db, v3, 'python', 'Crea dos cajas: a con 5 y b con 3. Muestra su suma.\n\n👉 Guarda los dos números y luego suma las cajas: print(a + b).', 'a = ...\nb = ...\nprint(a + b)', ['Crea las dos cajas: a = 5 y b = 3.', 'Suma las cajas por su nombre: a + b.', 'Muestra el resultado con print(a + b). Debe salir 8.'])
variant(db, v3, 'blocks', 'Crea dos cajas, a con 5 y b con 3, y muestra su suma.\n\n🧩 Crea dos variables (a y b) en «Variables». Ponles 5 y 3. Suma con el bloque de operación de «Matemáticas» metiendo «a» y «b». Encájalo en «imprimir».', '', ['Crea a y b y ponles 5 y 3 con «poner __ a».', 'Coge el bloque de operación (+) y mete «a» y «b».', 'Mete la suma dentro de «imprimir».'])
tc(db, v3, null, '8', 0)

const v4 = challenge(db, vars, 'juntar-textos', 'Pegar textos', 'El signo + tiene un truco: si lo usas con textos, en vez de sumar los PEGA uno detrás de otro (esto se llama unir o concatenar). Así puedes construir frases juntando trozos y cajas.', 3)
variant(db, v4, 'js', 'Crea una caja nombre con "Lia" y muestra: Hola, Lia. ¿Qué tal?\n\n👉 Pega los trozos con +: "Hola, " + nombre + ". ¿Qué tal?"', 'let nombre = "..."\nprint("Hola, " + nombre + "...")', ['Guarda el texto: let nombre = "Lia".', 'Pega los trozos con +: "Hola, " + nombre + ". ¿Qué tal?"', 'Cuida los espacios y signos: debe salir exactamente "Hola, Lia. ¿Qué tal?".'])
variant(db, v4, 'python', 'Crea una caja nombre con "Lia" y muestra: Hola, Lia. ¿Qué tal?\n\n👉 Pega los trozos con +: "Hola, " + nombre + ". ¿Qué tal?"', 'nombre = "..."\nprint("Hola, " + nombre + "...")', ['Guarda el texto: nombre = "Lia".', 'Pega los trozos con +: "Hola, " + nombre + ". ¿Qué tal?"', 'Cuida los espacios y signos: debe salir exactamente "Hola, Lia. ¿Qué tal?".'])
variant(db, v4, 'blocks', 'Guarda "Lia" en una caja nombre y muestra: Hola, Lia. ¿Qué tal?\n\n🧩 Usa «combinar textos» (en «Imprimir»). Con su ruedita ⚙️ añade un tercer hueco: «Hola, » + [nombre] + «. ¿Qué tal?».', '', ['Crea la variable nombre y ponle el texto «Lia».', 'En «combinar textos» añade un hueco con la ruedita ⚙️ para tener tres trozos.', 'Trozos: «Hola, », el bloque «nombre», y «. ¿Qué tal?». Mételo en «imprimir».'])
tc(db, v4, null, 'Hola, Lia. ¿Qué tal?', 0)
```

- [ ] **Step 4: Ejecuta y verifica que pasa**

Run: `npm test -- seed-solutions`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/curriculum/seed.ts src/lib/curriculum/seed-solutions.test.ts
git commit -m "feat(curriculum): lecciones de variables (cajas con números y textos)"
```

---

### Task 5: Concepto 2 — "¿Qué es un dato que llega?" (presenta `input`)

Añade el reto `que-es-input` (ord 0) al concepto `datos-input`. `suma` y `doble` ya están en ord 1 y 2.

**Files:**
- Modify: `src/lib/curriculum/seed.ts`
- Modify: `src/lib/curriculum/seed-solutions.test.ts`

- [ ] **Step 1: Añade entrada al arnés (TDD)**

```ts
  'que-es-input': 'print("Tu número es " + input.n)',
```

- [ ] **Step 2: Ejecuta y verifica que FALLA**

Run: `npm test -- seed-solutions`
Expected: FAIL — `que-es-input` no existe aún.

- [ ] **Step 3: Añade el reto al seed**

En el concepto `datos`, ANTES de `suma`, añade. **Importante:** la variante Python usa una f-string con comillas dobles dentro de simples; escríbela con backticks para evitar escapes:

```ts
const d1 = challenge(db, datos, 'que-es-input', '¿Qué es un dato que llega?', 'Hasta ahora los valores los escribías tú. Pero un programa de verdad recibe datos de fuera: lo que teclea una persona, lo que manda otro programa… En estos retos te los damos nosotros, guardados en una caja especial llamada input. Para sacar lo que hay dentro escribes input. y el nombre del dato. Aquí input trae un número en input.n.', 0)
variant(db, d1, 'js', 'input trae un número en input.n. Muestra: Tu número es N (donde N es ese número).\n\n👉 input.n es la caja con el número. Pega el texto y el número con +: "Tu número es " + input.n.', 'print("Tu número es " + input.n)', ['input.n es el número que te damos; no lo escribes tú.', 'Pega texto y número con +: "Tu número es " + input.n.', 'Cuida el espacio después de "es".'])
variant(db, d1, 'python', 'input trae un número en input["n"]. Muestra: Tu número es N (donde N es ese número).\n\n👉 Con una f-string metes el número dentro del texto: f"Tu número es {input[\'n\']}".', `print(f"Tu número es {input['n']}")`, ['input["n"] es el número que te damos; no lo escribes tú.', 'Una f-string mete el valor en el texto: f"Tu número es {input[\'n\']}".', 'Cuida el espacio después de "es".'])
variant(db, d1, 'blocks', 'input trae un número (n). Muestra: Tu número es N.\n\n🧩 En «Datos» está el bloque «dato __»: escribe n dentro para sacar el número. Únelo al texto «Tu número es » con «combinar textos» y mételo en «imprimir».', '', ['De «Datos» coge «dato __» y escribe n.', 'Usa «combinar textos»: primer hueco el texto «Tu número es », segundo hueco «dato n».', 'Mete «combinar textos» dentro de «imprimir».'])
tc(db, d1, { n: 7 }, 'Tu número es 7', 0)
tc(db, d1, { n: 100 }, 'Tu número es 100', 1)
```

- [ ] **Step 4: Ejecuta y verifica que pasa**

Run: `npm test -- seed-solutions`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/curriculum/seed.ts src/lib/curriculum/seed-solutions.test.ts
git commit -m "feat(curriculum): lección que presenta input con calma"
```

---

### Task 6: Concepto 3 — "¿Sí o no?" (if simple)

Añade el reto `si-o-no` (ord 0) al concepto `condicionales`, antes de `par-impar`.

**Files:**
- Modify: `src/lib/curriculum/seed.ts`
- Modify: `src/lib/curriculum/seed-solutions.test.ts`

- [ ] **Step 1: Añade entrada al arnés (TDD)**

```ts
  'si-o-no': 'if (input.edad >= 18) {\n  print("mayor")\n} else {\n  print("menor")\n}',
```

- [ ] **Step 2: Ejecuta y verifica que FALLA**

Run: `npm test -- seed-solutions`
Expected: FAIL — `si-o-no` no existe aún.

- [ ] **Step 3: Añade el reto al seed**

En el concepto `cond`, ANTES de `par-impar`:

```ts
const c0 = challenge(db, cond, 'si-o-no', '¿Sí o no?', 'Un programa puede TOMAR DECISIONES. Con if (que significa «si») le dices: «si se cumple esto, haz aquello». Y con else («si no») dices qué hacer en el otro caso. Vamos a decidir si alguien es mayor de edad (18 años o más).', 0)
variant(db, c0, 'js', 'input trae una edad en input.edad. Si es 18 o más, muestra "mayor"; si no, muestra "menor".\n\n👉 >= significa "mayor o igual que". El bloque else cubre el otro caso.', 'if (input.edad >= 18) {\n  print("...")\n} else {\n  print("...")\n}', ['Compara con >=: input.edad >= 18.', 'Dentro del if muestra "mayor"; en el else muestra "menor".', 'No olvides las llaves { } de cada bloque.'])
variant(db, c0, 'python', 'input trae una edad en input["edad"]. Si es 18 o más, muestra "mayor"; si no, muestra "menor".\n\n👉 >= significa "mayor o igual que". En Python el if termina en : y el cuerpo va indentado.', 'if input["edad"] >= 18:\n    print("...")\nelse:\n    print("...")', ['Compara con >=: input["edad"] >= 18.', 'El if y el else terminan en : y su cuerpo va con sangría.', 'Dentro del if muestra "mayor"; en el else, "menor".'])
variant(db, c0, 'blocks', 'Si input.edad es 18 o más, muestra "mayor"; si no, "menor".\n\n🧩 Usa «si … si no» de «Lógica». Compara «dato edad» con 18 usando «__ ≥ __» (elige ≥ en el menú). Dentro del «si» imprime «mayor», en el «si no» imprime «menor».', '', ['Coge «dato edad» de «Datos» y compáralo con 18 usando «__ ≥ __» («Lógica», elige ≥).', 'Mete la comparación en el «si» del bloque «si … si no».', 'En el «si» imprime «mayor»; en el «si no», «menor».'])
tc(db, c0, { edad: 18 }, 'mayor', 0)
tc(db, c0, { edad: 25 }, 'mayor', 1)
tc(db, c0, { edad: 10 }, 'menor', 2)
```

- [ ] **Step 4: Ejecuta y verifica que pasa**

Run: `npm test -- seed-solutions`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/curriculum/seed.ts src/lib/curriculum/seed-solutions.test.ts
git commit -m "feat(curriculum): if simple (mayor/menor de edad)"
```

---

### Task 7: Concepto 6 — Mini-proyecto "Calculadora"

Añade `calculadora` (ord 0) al concepto `proyectos`. Soporta `+`, `-`, `*` (sin división, ver Global Constraints).

**Files:**
- Modify: `src/lib/curriculum/seed.ts`
- Modify: `src/lib/curriculum/seed-solutions.test.ts`

- [ ] **Step 1: Añade entrada al arnés (TDD)**

```ts
  calculadora:
    'if (input.op === "+") {\n  print(input.a + input.b)\n} else if (input.op === "-") {\n  print(input.a - input.b)\n} else {\n  print(input.a * input.b)\n}',
```

- [ ] **Step 2: Ejecuta y verifica que FALLA**

Run: `npm test -- seed-solutions`
Expected: FAIL — `calculadora` no existe aún.

- [ ] **Step 3: Añade el reto al seed**

En el concepto `proyectos`:

```ts
const m1 = challenge(db, proyectos, 'calculadora', 'Calculadora', '¡Hora de combinar todo! Una calculadora recibe dos números y una operación, y según cuál sea, suma, resta o multiplica. Usarás condicionales encadenados y operaciones de matemáticas.', 0)
variant(db, m1, 'js', 'input trae dos números (input.a, input.b) y una operación (input.op), que será "+", "-" o "*". Muestra el resultado de aplicarla.\n\n👉 Compara input.op con cada signo usando if / else if y haz la cuenta que toque.', 'if (input.op === "+") {\n  print(...)\n} else if (input.op === "-") {\n  print(...)\n} else {\n  print(...)\n}', ['Compara el texto de la operación: input.op === "+".', 'Encadena if / else if / else para los tres signos.', 'En cada rama haz la cuenta: input.a + input.b, input.a - input.b o input.a * input.b.'])
variant(db, m1, 'python', 'input trae dos números (input["a"], input["b"]) y una operación (input["op"]), que será "+", "-" o "*". Muestra el resultado de aplicarla.\n\n👉 Compara input["op"] con cada signo usando if / elif y haz la cuenta que toque.', 'if input["op"] == "+":\n    print(...)\nelif input["op"] == "-":\n    print(...)\nelse:\n    print(...)', ['Compara el texto de la operación: input["op"] == "+".', 'En Python "else if" se escribe elif.', 'En cada rama haz la cuenta: input["a"] + input["b"], input["a"] - input["b"] o input["a"] * input["b"].'])
variant(db, m1, 'blocks', 'Reto experto 🧠 input trae a, b y una operación op ("+", "-" o "*"). Muestra el resultado.\n\n🧩 Usa «si … si no» (con la ruedita ⚙️ añade una rama «si no, si»). Compara «dato op» con un texto «+» usando «__ = __» («Lógica»). En cada rama, una operación de «Matemáticas» con «dato a» y «dato b».', '', ['Con la ruedita ⚙️ del «si … si no» añade una rama para tener: si / si no si / si no.', 'Compara «dato op» con el texto «+» (y con «-») usando «__ = __».', 'En cada rama mete una operación de «Matemáticas» (+, − o ×) con «dato a» y «dato b», dentro de «imprimir».'])
tc(db, m1, { a: 6, op: '+', b: 4 }, '10', 0)
tc(db, m1, { a: 6, op: '-', b: 4 }, '2', 1)
tc(db, m1, { a: 6, op: '*', b: 4 }, '24', 2)
```

- [ ] **Step 4: Ejecuta y verifica que pasa**

Run: `npm test -- seed-solutions`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/curriculum/seed.ts src/lib/curriculum/seed-solutions.test.ts
git commit -m "feat(curriculum): mini-proyecto Calculadora"
```

---

### Task 8: Concepto 6 — Mini-proyectos "Validador de contraseñas" y "Adivina el número"

Añade `validador-contrasena` (ord 1) y `adivina-numero` (ord 2). Ambos usan texto/listas que el toolbox de bloques no soporta → **solo variantes JS y Python** (sin bloques), igual que los retos de listas existentes.

**Files:**
- Modify: `src/lib/curriculum/seed.ts`
- Modify: `src/lib/curriculum/seed-solutions.test.ts`

- [ ] **Step 1: Añade entradas al arnés (TDD)**

```ts
  'validador-contrasena':
    'let s = input.clave\nlet largo = s.length >= 6\nlet tieneNum = false\nfor (let i = 0; i < s.length; i++) {\n  if (s[i] >= "0" && s[i] <= "9") tieneNum = true\n}\nif (largo && tieneNum) print("segura")\nelse print("débil")',
  'adivina-numero':
    'for (let i = 0; i < input.intentos.length; i++) {\n  let g = input.intentos[i]\n  if (g < input.secreto) print("más alto")\n  else if (g > input.secreto) print("más bajo")\n  else print("¡acertaste!")\n}',
```

- [ ] **Step 2: Ejecuta y verifica que FALLA**

Run: `npm test -- seed-solutions`
Expected: FAIL — los slugs no existen aún.

- [ ] **Step 3: Añade los retos al seed**

En el concepto `proyectos`, después de `calculadora`:

```ts
const m2 = challenge(db, proyectos, 'validador-contrasena', 'Validador de contraseñas', 'Comprobemos si una contraseña es segura. Será "segura" solo si cumple DOS reglas a la vez: tener 6 letras o más Y contener al menos un número. Si le falta alguna, es "débil". Combinas longitud de texto, un bucle y condiciones unidas con Y.', 1)
variant(db, m2, 'js', 'Reto experto 🧠 input trae una contraseña en input.clave. Muestra "segura" si tiene 6 caracteres o más Y contiene al menos un número; si no, "débil".\n\n👉 input.clave.length es su longitud. Recorre los caracteres con un bucle: s[i] es un dígito si está entre "0" y "9".', 'let s = input.clave\n// ¿es larga? ¿tiene algún número?\n', ['s.length te da cuántos caracteres tiene la contraseña.', 'Recorre con un for; s[i] es el carácter en la posición i. Es un dígito si s[i] >= "0" && s[i] <= "9".', 'Solo es "segura" si se cumplen LAS DOS cosas (longitud y dígito); une las condiciones con &&.'])
variant(db, m2, 'python', 'Reto experto 🧠 input trae una contraseña en input["clave"]. Muestra "segura" si tiene 6 caracteres o más Y contiene al menos un número; si no, "débil".\n\n👉 len(s) es la longitud. c.isdigit() dice si un carácter c es un número. any(...) comprueba si alguno cumple.', 's = input["clave"]\n# ¿es larga? ¿tiene algún número?\n', ['len(s) >= 6 comprueba la longitud.', 'any(c.isdigit() for c in s) es True si algún carácter es un número.', 'Une las dos condiciones con and; imprime "segura" o "débil".'])
tc(db, m2, { clave: 'abc' }, 'débil', 0)
tc(db, m2, { clave: 'abcdef' }, 'débil', 1)
tc(db, m2, { clave: 'abc123' }, 'segura', 2)
tc(db, m2, { clave: 'ab1' }, 'débil', 3)

const m3 = challenge(db, proyectos, 'adivina-numero', 'Adivina el número', 'El clásico juego de adivinar. Hay un número secreto y una lista de intentos. Por cada intento dices si hay que apuntar más alto, más bajo, o si acertó. Combinas listas, un bucle y condicionales encadenados.', 2)
variant(db, m3, 'js', 'Reto experto 🧠 input trae un número secreto (input.secreto) y una lista de intentos (input.intentos). Por cada intento, en su línea, muestra:\n• "más alto" si el intento es MENOR que el secreto,\n• "más bajo" si es MAYOR,\n• "¡acertaste!" si es igual.\n\n👉 Recorre la lista con un bucle y compara cada intento con input.secreto.', 'for (let i = 0; i < input.intentos.length; i++) {\n  let g = input.intentos[i]\n  // compara g con input.secreto\n}', ['Recorre la lista: input.intentos[i] es cada intento.', 'Si g < secreto, el secreto es más grande → "más alto"; si g > secreto → "más bajo".', 'Si no es ni menor ni mayor, es igual → "¡acertaste!". Usa if / else if / else.'])
variant(db, m3, 'python', 'Reto experto 🧠 input trae un número secreto (input["secreto"]) y una lista de intentos (input["intentos"]). Por cada intento, en su línea, muestra:\n• "más alto" si el intento es MENOR que el secreto,\n• "más bajo" si es MAYOR,\n• "¡acertaste!" si es igual.\n\n👉 Recorre la lista con for g in input["intentos"] y compara g con input["secreto"].', 'for g in input["intentos"]:\n    # compara g con input["secreto"]\n    pass', ['for g in input["intentos"] te da cada intento en g.', 'Compara g con input["secreto"] con if / elif / else.', 'Menor → "más alto"; mayor → "más bajo"; igual → "¡acertaste!".'])
tc(db, m3, { secreto: 5, intentos: [2, 8, 5] }, 'más alto\nmás bajo\n¡acertaste!', 0)
tc(db, m3, { secreto: 3, intentos: [3] }, '¡acertaste!', 1)
tc(db, m3, { secreto: 10, intentos: [10, 1] }, '¡acertaste!\nmás alto', 2)
```

- [ ] **Step 4: Ejecuta y verifica que pasa**

Run: `npm test -- seed-solutions`
Expected: PASS (los 28 retos del arnés en verde).

- [ ] **Step 5: Commit**

```bash
git add src/lib/curriculum/seed.ts src/lib/curriculum/seed-solutions.test.ts
git commit -m "feat(curriculum): mini-proyectos validador de contraseñas y adivina el número"
```

---

### Task 9: Actualizar tests estructurales y verificación final

Pon en verde los tests que afirman la estructura vieja y verifica la app de punta a punta.

**Files:**
- Modify: `src/lib/curriculum/repository.test.ts`
- Modify: cualquier otro test que falle por contar conceptos/retos (se descubre al ejecutar la suite).

- [ ] **Step 1: Actualiza `repository.test.ts`**

Cambia la aserción de número de conceptos:

```ts
  it('retorna 7 conceptos', () => {
    const concepts = new CurriculumRepository(db).listConceptsWithChallenges()
    expect(concepts).toHaveLength(7)
  })
```

La aserción "el primer concepto tiene 5 retos" **sigue siendo válida** (`primeros-pasos` tiene 5). Verifica también que el primer concepto sea el correcto si quieres reforzar:

```ts
  it('el primer concepto es Primeros pasos con 5 retos', () => {
    const [first] = new CurriculumRepository(db).listConceptsWithChallenges()
    expect(first.slug).toBe('primeros-pasos')
    expect(first.challenges).toHaveLength(5)
  })
```

- [ ] **Step 2: Ejecuta la suite completa y corrige lo que falle**

Run: `npm test`
Expected: PASS. Si algún test de `grading`, `progress`, `smoke` o similar falla por asumir el número/orden de conceptos o un slug movido (p. ej. que `suma` esté en `fundamentos`), actualízalo a la nueva estructura. El concepto `fundamentos` ya no existe; ahora es `primeros-pasos`.

- [ ] **Step 3: Verificación manual en la app (re-seed + dev server)**

Como `SEED_VERSION` subió a 6, la base de datos local se vuelve a sembrar al arrancar. Si tu `data.sqlite` local no se regenera, bórralo o borra la fila `seed_version` para forzar el re-seed.

Arranca el servidor de desarrollo y comprueba:

- Aparecen los 7 conceptos en orden.
- Abre `primeros-pasos → primera-cuenta`: resuelve `print(2 + 3)` y confirma que **califica como superado**.
- Abre `datos-input → que-es-input` en la pestaña **Python** y comprueba que `print(f"Tu número es {input['n']}")` imprime `Tu número es 7` para el primer caso (valida la f-string de Python, que el arnés JS no cubre).
- Abre `proyectos → adivina-numero` y pega la solución JS de referencia; confirma que pasa.
- Abre una variante de **Bloques** nueva (p. ej. `primera-cuenta`) y comprueba que las piezas mencionadas existen en el toolbox y encajan.

Documenta brevemente el resultado (capturas o notas). Si algo no califica, revisa el `expected_output` correspondiente.

- [ ] **Step 4: Commit**

```bash
git add src/lib/curriculum/repository.test.ts
git commit -m "test(curriculum): estructura de 7 conceptos"
```

---

## Self-Review (cobertura del spec)

- **Rampa sin `input` (conceptos 0-1):** Tareas 3-4 — imprimir varias líneas, números, cuentas, variables con números/textos. ✓
- **`input` como tema propio (concepto 2):** Tarea 5 (`que-es-input`) antes de `suma`/`doble`. ✓
- **`if` simple antes de par/impar:** Tarea 6 (`si-o-no`). ✓
- **3 variantes en lecciones de principiante:** Tareas 3-6 incluyen js/python/blocks. ✓
- **Mini-proyectos avanzados:** Tareas 7-8 (calculadora, validador, adivina). ✓
- **Bloques solo del toolbox; omitir donde no haya piezas:** validador y adivina sin bloques (texto/listas). ✓ (documentado en Global Constraints).
- **SEED_VERSION 5→6 y re-seed:** Tarea 2 + verificación en Tarea 9. ✓
- **Sin cambios de UI/motor:** ninguna tarea toca esos archivos. ✓
- **Caveat de división (float en Python):** resuelto evitando `/` en todos los retos nuevos. ✓
- **Tests estructurales actualizados:** Tarea 9. ✓
