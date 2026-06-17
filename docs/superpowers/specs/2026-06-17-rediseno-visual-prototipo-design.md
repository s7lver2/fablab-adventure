# Rediseño visual del prototipo (alumno) — Fab Lab León

**Fecha:** 2026-06-17
**Estado:** Diseño aprobado, pendiente de plan de implementación
**Ámbito:** Solo presentación (UI). No toca API, base de datos, motores, validación ni el panel de admin.

## 1. Objetivo

Dar al prototipo del alumno un aspecto mucho menos primitivo y un layout acorde a lo
que es (una plataforma para que niños de 7–18 años aprendan a programar jugando).
Se rediseñan **login**, **home (`/`)** y **perfil**, más un **tema visual y layout
compartidos**.

Restricción clave: **solo mejoras de aspecto, sin características nuevas**, con la única
excepción —pedida explícitamente por el usuario— de convertir el perfil en una *vista*
con resumen de progreso y edición mediante un lapicero. Esos datos de progreso ya existen
en la BD (`progress`); no se añade lógica ni almacenamiento nuevo.

## 2. Dirección visual elegida

**Estilo "Aventura gamificada" (claro).** Tono de juego, amable para peques pero válido
hasta 18:

- **Fondo:** degradado claro cálido — ámbar → rosa → violeta
  (`#fff7ed → #ffe4e6 → #ede9fe`).
- **Acentos:** ámbar `#fbbf24` / `#f59e0b`, verde `#34d399` / `#059669`,
  violeta `#a78bfa` / `#7c3aed`.
- **Tarjetas:** blancas (`#fff`), muy redondeadas (radio 18–24px), borde de color grueso
  (2–3px) y **sombra inferior sólida tipo botón** (p. ej. `box-shadow: 0 5px 0 <color-oscuro>`),
  que da el efecto "3D" característico.
- **Tipografía:** sans del sistema; titulares con pesos altos (700–900).
- **Estrellas:** emoji ⭐ para conseguidas, atenuadas (opacity .3) para no conseguidas.

## 3. Sistema visual compartido (`globals.css`)

Se reescribe `globals.css` con los tokens anteriores y estilos base para que las páginas
dejen de depender de estilos inline:

- Variables CSS: fondo/degradado, colores de acento, radios, sombras tipo botón, fuente.
- Estilos base de `button` (relleno de color + sombra inferior), `input`/`textarea`
  (redondeados, borde claro, foco con color de acento), y utilidades de tarjeta y estrellas.
- El degradado de fondo y la fuente se aplican en `body`.

## 4. Layout compartido

- **`layout.tsx`** aplica fondo, fuente y mantiene `MaintenanceRedirector`. No fuerza la
  cabecera (login no la lleva).
- **Componente `AppBar`** (nuevo, presentacional): marca "Fab Lab Quest" 🚀🦊 + enlace a
  perfil + avatar del alumno. Se incluye en páginas internas (home, perfil), **no** en login.

## 5. Páginas

### 5.1 Login (`/login`)
- Card de bienvenida centrada: marca + mascota, mensaje amable ("¡Hola! ¿Cómo te llamas?"),
  campo de nombre de usuario y botón "¡Entrar! →".
- **Sin AppBar** (el alumno aún no ha entrado).
- Misma función actual: login solo con nombre de usuario, sin contraseña. Se eliminan los
  estilos inline; se gestiona el estado de error con el estilo nuevo.

### 5.2 Home (`/`)
- **AppBar** arriba.
- **Saludo** ("¡Hola, {displayName}! 👋") + chip resumen (estrellas totales / nº de retos
  hechos). Las estrellas/conteo se derivan de `progress` (dato ya existente).
- **Bloque "siguiente misión"**: usa `nextChallengeSlug` (ya implementado) → tarjeta
  destacada con botón "¡Jugar!".
- **"Tu aventura"**: la misma lista de retos de ahora (`curriculum.listChallenges()`), con
  estados visuales:
  - **Hecho:** check verde + estrellas conseguidas.
  - **Actual:** tarjeta resaltada (borde ámbar) con "¡seguir! →".
  - **Futuros:** atenuados visualmente, **sin candado** y **siguen siendo clicables**
    (no se introduce bloqueo; el bloqueo real, si se quiere, será una feature aparte).

### 5.3 Perfil (`/profile`)
Pasa de "solo formulario" a **vista de perfil** con edición bajo demanda:

- **Vista (por defecto):**
  - Tarjeta de perfil: avatar (emoji), nombre, mensaje de perfil.
  - **Lapicero ✏️** arriba a la derecha, visible **solo si es el propio perfil del alumno
    logueado**.
  - Stats: estrellas totales y retos hechos (derivado de `progress`).
  - Lista de "Conseguido": retos completados con sus estrellas.
- **Edición (al pulsar ✏️):** mismos campos actuales — nombre, mensaje (con contador
  ≤100), avatar. Botones Guardar / Cancelar. Usa el `PATCH /api/me` existente.
- **Avatar como emoji:** el campo `avatar` es texto libre en la BD; se usa un emoji (que es
  texto), por lo que no cambia el esquema. La subida de imágenes reales queda fuera de
  alcance (feature futura).

## 6. Componentes (unidades aisladas)

Piezas pequeñas, presentacionales y reutilizables entre páginas:

- **`AppBar`** — marca + perfil + avatar. Entrada: usuario. Sin estado.
- **`ChallengeRow`** — fila de reto con estado (hecho / actual / futuro) y estrellas.
  Entrada: reto + estado + estrellas.
- **`StarRating`** — pinta N de 3 estrellas. Entrada: nº de estrellas.
- **`StatCard`** — número grande + etiqueta (estrellas, retos). Entrada: valor + etiqueta.
- **`ProfileCard`** — avatar + nombre + mensaje, con slot opcional para el lapicero.

Cada uno se entiende y prueba por separado; reciben datos por props y no acceden a la BD
directamente (los datos se obtienen en los componentes de página existentes).

## 7. Fuera de alcance

- Cualquier cambio en API, esquema SQLite, motores de ejecución, validación, estrellas o
  lógica de grafo.
- **Panel de administración** (se rediseñará por separado más adelante).
- Bloqueo real de retos, subida de imágenes de avatar, perfiles públicos de otros alumnos.
- Estética sonora/ambientación (ya fuera del MVP).

## 8. Verificación

- Las tres páginas renderizan con el tema nuevo sin estilos inline residuales.
- Login sigue autenticando solo con nombre de usuario.
- Home muestra siguiente lección y la lista con estados correctos según `progress`.
- Perfil muestra la vista; el ✏️ aparece solo para el propio perfil y abre/cierra edición;
  Guardar persiste vía `PATCH /api/me`.
- Sin regresiones en los tests existentes (este trabajo no toca lógica con tests).
