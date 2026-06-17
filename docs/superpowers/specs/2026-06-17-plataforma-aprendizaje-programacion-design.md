# Plataforma de aprendizaje de programación — Fab Lab León

**Fecha:** 2026-06-17
**Estado:** Diseño aprobado, pendiente de plan de implementación

## 1. Objetivo

Recurso online donde los alumnos del Fab Lab León (niños de **7 a 18 años**) aprenden
programación de forma divertida pero retadora. Cada nivel enseña **un concepto** de
programación; superar el nivel da la **certeza de que el alumno ha adquirido ese concepto**.

Principios rectores:

- **No hay un único camino correcto.** La validación nunca juzga *cómo* se escribe el
  código, solo *qué hace*. El alumno es libre de resolverlo con `for`, `while`, recursión…
- **Lenguaje correcto y no malsonante.** Todo mensaje (incluidos errores) es claro, amable
  y didáctico, apropiado para la edad.
- **Sin datos sensibles.** Acceso de alumno solo con nombre de usuario, sin contraseña.
- **Local primero.** Por ahora todo corre en un único servidor del Fab Lab, con
  almacenamiento local. El salto a plataforma online queda fuera de esta fase.

## 2. Stack técnico

- **Next.js + React + TypeScript** — front + API + backend admin en un solo proceso, ideal
  para un único servidor local. Permite un salto futuro a online sin reescritura.
- **SQLite** (fichero local) como base de datos.
- **Ejecución de código del alumno 100% en el navegador** (ver §6). El servidor **nunca**
  ejecuta código del alumno.

## 3. Arquitectura general

```
┌─ Navegador del alumno ────────────────┐     ┌─ Servidor Fab Lab (Next.js) ──┐
│  React (UI)                            │     │  Route Handlers / API         │
│  ┌─ Motores de ejecución (3) ──────┐   │ ←→  │  Auth · Currículo · Validación │
│  │  Bloques (Blockly → JS)         │   │     │  Progreso · Apelaciones · Admin │
│  │  JS  (Web Worker aislado)       │   │     │                               │
│  │  Python (Pyodide/WASM Worker)   │   │     │  SQLite (fichero local)       │
│  └─────────────────────────────────┘   │     └───────────────────────────────┘
└────────────────────────────────────────┘
```

El código del alumno se ejecuta solo en su navegador; el servidor guarda usuarios/progreso,
**verifica resultados** y sirve el contenido. El único código que el servidor ejecuta es la
**solución de referencia del autor** del reto (código de confianza), para calcular salidas
esperadas (ver §6.4).

## 4. Modelo de dominio

- **Concepto** — unidad del temario (variables, bucles, condicionales…).
- **Reto** — enseña *un* concepto. Tiene **variantes por lenguaje** (Bloques/JS/Python):
  enunciado, código inicial, pistas opcionales, texto narrativo. La validación es por salida,
  así que los casos de prueba y la solución de referencia son **compartidos entre lenguajes**.
- **Caso de prueba / generador de entradas** — define cómo se generan las entradas (incluidas
  **entradas aleatorias por intento**) y, vía la solución de referencia, la salida esperada.
  Aquí vive el anti-trampa (entradas grandes/aleatorias).
- **Nodo de historia** + **aristas por estrellas** — el grafo "elige tu propia aventura":
  cada nodo es un reto; `3★ → nodo A`, `2★ → nodo B`, `<2★ → repetir`. Esto implementa la
  **historia única adaptativa**.
- **Usuario** — ver §5 (roles).
- **Progreso** — por usuario y nodo: estrellas, intentos, pistas usadas, estado, posición.
- **Solicitud de revisión (apelación)** — ver §7.

## 5. Usuarios y roles

Jerarquía de tres roles:

- **`root`** — cuenta **por defecto** sembrada al crear la base de datos. Única que lleva la
  flag **`hidden`** (cuenta privada: no aparece en listados, rankings ni como sujeto en las
  estadísticas). `hidden` **no es asignable por nadie ni se expone en ninguna UI**. root es
  el admin raíz que arranca el sistema; **no se puede crear desde la UI**.
- **`admin`** — accede al backend con **contraseña**. **Solo un admin (o root) puede
  crear/promover a otro admin.** No existe auto-promoción ni creación de admins desde el flujo
  normal de usuario.
- **`user`** — alumno normal, login solo con **nombre de usuario**, sin contraseña.

Perfil de usuario: ver progreso y por dónde se quedó; editar **nombre**, **avatar** y
**mensaje de perfil (≤100 caracteres)**.

La contraseña (hash) solo existe para `admin`/`root` y se usa exclusivamente para el backend.

## 6. Ejecución y validación

### 6.1 Motores de ejecución (navegador)

Los tres exponen el mismo contrato: `ejecutar(código, entradas) → { salida, error?, tiempoMs }`.
La validación es agnóstica al lenguaje.

- **Bloques (Blockly)** — el alumno arrastra bloques; Blockly compila a JS y se ejecuta como
  el motor JS. Orientado a 7-12 años.
- **JavaScript** — **Web Worker** aislado (sin DOM ni acceso a la página).
- **Python (Pyodide/WASM)** — **Web Worker** propio, sin disco ni red. Carga bajo demanda
  (primera vez tarda unos segundos; se cachea).

Cada motor corre en un Worker que se puede **matar por timeout**, controlando bucles
infinitos sin colgar el navegador.

### 6.2 Flujo de un intento

1. El alumno entra (nombre de usuario) → sesión por cookie. La plataforma calcula su **nodo
   actual** desde su progreso y muestra el árbol con la sugerencia de "siguiente lección".
2. Abre el reto y **elige lenguaje**.
3. El servidor envía: enunciado de la variante, código inicial, pistas y **las entradas**
   (generadas para este intento), pero **nunca las salidas esperadas**.
4. El alumno escribe y ejecuta en su navegador → el motor produce **salidas**.
5. El cliente envía al servidor las **salidas producidas** + metadatos (nº de intento, pistas).
6. El servidor **compara** salida-producida vs salida-esperada (que solo él conoce), calcula
   **estrellas**, **guarda el progreso** y devuelve el resultado + el **siguiente nodo** según
   la arista de estrellas.
7. La UI muestra las estrellas y **avanza la historia** por la rama correspondiente.

### 6.3 Por qué es anti-trampa y respeta "muchos caminos válidos"

- El servidor **jamás mira el código**, solo la salida → libertad total de método.
- Las **salidas esperadas viven solo en el servidor** → no se pueden leer en el navegador.
- Las **entradas grandes/aleatorias por intento** hacen inviable copiar a mano o precalcular
  → la vía práctica es usar el concepto.

### 6.4 Entradas aleatorias y solución de referencia

Al crear el reto, el autor aporta una **solución de referencia en JS**. El servidor (Node,
código de confianza del autor — nunca del alumno) genera las entradas del intento y ejecuta
esa solución para obtener la **salida esperada**. Esto habilita entradas aleatorias por
intento sin posibilidad de trampa.

### 6.5 Estrellas

`3★` a la primera o con pocas pistas; `2★` con varios intentos/muchas pistas; **repetir** si
no lo logra limpio. Los umbrales son **configurables por reto** desde el admin. El "nivel" del
usuario se deriva de su posición en el grafo y sus estrellas acumuladas.

## 7. Apelaciones (solicitudes de revisión)

Cuando el alumno cree que su solución es válida pero el sistema no la aceptó, puede pulsar
**"Creo que mi solución es válida"**, que crea una **solicitud de revisión** con: su **código**,
la **salida producida** y un **mensaje breve**.

- La solicitud entra en una **cola en el panel de admin** (estado `pendiente`).
- El admin puede **aceptar** (otorga aprobado/estrellas y opcionalmente **ajusta el reto**:
  añade la salida como válida o relaja la normalización) o **rechazar** (con feedback).
- El **código enviado se guarda solo para revisión humana y NUNCA se ejecuta en el servidor**.

**Límites (configurables en `settings`):**

- **1 solicitud pendiente por reto y alumno.**
- **Máx. 3 solicitudes pendientes simultáneas** por alumno en toda la plataforma.
- **Cooldown de 24 h** para reapelar el mismo reto tras un rechazo.

## 8. Panel de administración (incluido en el MVP)

- **Acceso con contraseña**; solo `admin`/`root`.
- **Gestión de usuarios** (incluida la creación de admins, solo por admins).
- **Modo mantenimiento** — página de mantenimiento para todos salvo admins.
- **Analítica** estilo dashboards de referencia: overview (visitas, sesiones, rebote, duración
  media), tráfico (fuentes/referrers, páginas, actividad por hora/día), sesiones
  (dispositivos/navegadores/SO) y **dónde se quedan los alumnos en el árbol**. Requiere
  **registro de eventos desde el día uno**.
- **Edición de contenido**: conceptos, retos, variantes por lenguaje, casos de
  prueba/solución de referencia y el **grafo de la historia** (nodos y aristas por estrellas).
- **Cola de revisión de apelaciones** (aceptar/rechazar con feedback y ajuste del reto).

> Nota: la **geolocalización** (países/ciudades) depende de IP; en una red local del Fab Lab
> puede no dar datos útiles. La estructura queda lista, pero ese widget puede salir vacío.

## 9. Manejo de errores

- **Errores de sintaxis/ejecución** → mensajes claros y no técnicos, nunca un stack trace
  intimidante ("Parece que falta cerrar un paréntesis").
- **Timeout** → "Tu programa tardó demasiado. ¿Quizás hay un bucle que no termina?".
- **Pyodide no carga / sin conexión** → aviso claro + reintento; los otros lenguajes siguen.
- **Servidor**: sesión inválida → login; **modo mantenimiento** → página de mantenimiento
  (salvo admins); salida que no coincide → resultado con pistas, no error.

## 10. Esquema de datos (SQLite)

- `users` — id, username (único), display_name, avatar, profile_message (≤100), role
  (`user`|`admin`|`root`), hidden (bool), password_hash (null para alumnos), created_at,
  last_seen.
- `concepts` — id, slug, name, description, orden.
- `challenges` — id, concept_id, slug, title, narrative, default_language, reference_solution
  (JS), input_generator (spec de entradas, incl. aleatorias), star_thresholds (config).
- `challenge_variants` — id, challenge_id, language (`blocks`|`js`|`python`), statement,
  starter_code, hints_json.
- `story_nodes` — id, challenge_id, …
- `story_edges` — from_node, outcome (`3star`|`2star`), to_node.
- `progress` — user_id, node_id, stars, attempts, hints_used, status, completed_at.
- `review_requests` — id, user_id, challenge_id, language, submitted_code, submitted_output,
  message, status (`pending`|`accepted`|`rejected`), reviewer_admin_id, created_at, resolved_at.
- `events` — registro para analítica (tipo, user_id, ruta, metadatos de sesión/dispositivo,
  timestamp).
- `settings` — modo_mantenimiento, límites de apelaciones (1 por reto, 3 globales, 24 h), …

## 11. Testing (TDD)

- **Unidad**: lógica de estrellas, resolución del siguiente nodo en el grafo, límites de
  apelaciones, validación de perfil (≤100), normalización de salidas, reglas de roles
  (admin solo creable por admin, `hidden` no asignable).
- **Motores**: cada runner con código→salida conocidos + comportamiento de timeout.
- **Integración**: flujo completo (login → intento → progreso → siguiente nodo); flujo de
  apelación (crear → límite → aceptar/rechazar); modo mantenimiento; siembra de `root`.

## 12. Alcance del MVP

**Dentro:**

1. Login por nombre de usuario + sesión + siembra de `root` (con `hidden` y contraseña).
2. Perfil (progreso + editar nombre/avatar/mensaje ≤100).
3. Currículo inicial con retos en los 3 lenguajes (pocos conceptos al principio, 4-5).
4. Los 3 motores de ejecución en el navegador con timeout.
5. Validación por salida con **entradas aleatorias por intento** + solución de referencia.
6. Estrellas (configurable).
7. Árbol/historia adaptativa con aristas por estrellas + sugerencia de siguiente lección.
8. Apelaciones con sus límites.
9. **Panel de admin completo** (§8): backend con contraseña, gestión de usuarios, modo
   mantenimiento, analítica con registro de eventos, edición de contenido y grafo, cola de
   apelaciones.

Construido en **hitos** dentro del MVP para tener siempre un producto funcionando:

- **Hito A — Bucle de aprendizaje:** auth + perfil + un motor + validación (entradas fijas) +
  un currículo lineal mínimo.
- **Hito B — Adaptatividad y motores:** los 3 motores + estrellas + grafo con aristas +
  entradas aleatorias/solución de referencia.
- **Hito C — Apelaciones.**
- **Hito D — Panel de admin** (cimientos de eventos desde A; analítica + edición + cola aquí).

**Fuera del MVP:** estética/ambientación/música; plataforma online + contraseñas encriptadas
para todos los alumnos.
