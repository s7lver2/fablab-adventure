# Guía de estilo · Fab Lab Quest

Documento de referencia del sistema visual de la plataforma, pensado para
incorporarse a [fablableon.org](https://fablableon.org/). Todos los valores
están extraídos del código real (`src/app/globals.css` y
`src/app/admin/(protected)/components/adminUi.tsx`).

La plataforma usa **dos lenguajes visuales** complementarios:

| | **Tema Alumno** (gamificado) | **Tema Admin** (técnico) |
|---|---|---|
| Público | Niños y principiantes | Mentores / administración |
| Sensación | Cálido, divertido, táctil | Sobrio, denso, de "consola" |
| Fondo | Degradado pastel | Slate oscuro (o claro) |
| Bordes | Gruesos (3 px) + sombra sólida | Finos (0.5–1 px), planos |
| Tipografía | Sans redondeada, pesos altos | Monospace + sans |
| Acento | Ámbar / verde / violeta | Índigo |

---

## 1. Tema Alumno (gamificado)

La cara visible para el estudiante. Inspirado en apps tipo Duolingo: botones
"pulsables" con sombra inferior sólida, tarjetas redondeadas de borde grueso y
una paleta cálida.

### 1.1 Tokens de color

```css
:root {
  /* Fondo degradado cálido */
  --bg-1: #fff7ed;   /* crema */
  --bg-2: #ffe4e6;   /* rosa pálido */
  --bg-3: #ede9fe;   /* lavanda pálido */

  /* Acentos */
  --amber:        #fbbf24;   --amber-dark:  #f59e0b;   /* acción primaria */
  --green:        #34d399;   --green-dark:  #059669;   /* logro / éxito */
  --violet:       #a78bfa;   --violet-dark: #7c3aed;   /* marca / enlaces */

  /* Texto y superficie */
  --text:     #3b2f2f;   /* marrón cálido, no negro puro */
  --text-dim: #7c6f6f;
  --card:     #fff;
}
```

**Fondo de página** (fijo, no hace scroll con el contenido):

```css
body {
  background: linear-gradient(160deg, var(--bg-1) 0%, var(--bg-2) 50%, var(--bg-3) 100%);
  background-attachment: fixed;
  color: var(--text);
}
```

Semántica de color:
- **Ámbar** → acción primaria (botón "¡Jugar!", "Ejecutar"), pistas.
- **Verde** → progreso, estrellas, aciertos, KPIs del alumno.
- **Violeta** → identidad de marca, enlaces, foco de formularios.
- **Rojo** (`#dc2626`) → solo para errores.

### 1.2 Tipografía

```css
--font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
```

Pesos muy marcados (la jerarquía se construye con grosor, no solo tamaño):

| Elemento | Tamaño | Peso |
|---|---|---|
| `h1` | 1.8 rem | 900 |
| `h2` | 1.2 rem | 800 |
| Botón | 1 rem | 800 |
| Cuerpo | 1 rem | 400–700 |

### 1.3 Radios y sombras (la firma visual)

```css
--radius:    20px;   /* tarjetas */
--radius-sm: 14px;   /* botones, campos */
```

La marca de la casa es la **sombra inferior sólida** (sin desenfoque), que da
sensación de objeto físico que se "hunde" al pulsar:

```css
/* Tarjeta */
box-shadow: 0 5px 0 var(--violet-dark);   /* borde 3px violeta */

/* Botón en reposo → pulsado */
box-shadow: 0 4px 0 var(--amber-dark);
/* :active */ transform: translateY(4px); box-shadow: 0 0 0 var(--amber-dark);
```

### 1.4 Componentes

**Botón primario** — ámbar, sombra sólida, se hunde al pulsar:

```css
.btn {
  background: var(--amber);
  color: #3b2f2f;
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 0 var(--amber-dark);
  padding: 0.7rem 1.3rem;
  font-weight: 800;
}
.btn:active { transform: translateY(4px); box-shadow: 0 0 0 var(--amber-dark); }
```

**Botón secundario** — blanco con borde y sombra violeta:

```css
.btn-secondary {
  background: #fff;
  color: var(--violet-dark);
  border: 2px solid var(--violet);
  box-shadow: 0 4px 0 var(--violet);
}
```

**Tarjeta** — base de casi todo:

```css
.card {
  background: var(--card);
  border: 3px solid var(--violet);
  border-radius: var(--radius);
  box-shadow: 0 5px 0 var(--violet-dark);
  padding: 1.25rem;
}
```

**Variantes de tarjeta** por intención: misión/consola usan ámbar
(`border: 3px var(--amber)` + `0 5px 0 var(--amber-dark)`), stat-cards usan verde.

**Chip / píldora** (p. ej. estrellas obtenidas):

```css
.chip {
  background: #fff;
  border: 2px solid var(--green);
  box-shadow: 0 3px 0 var(--green-dark);
  border-radius: 999px;
  color: var(--green-dark);
  font-weight: 800;
}
```

**Campos de formulario** — borde rosado neutro, foco violeta con halo:

```css
input, textarea {
  background: #fff;
  border: 2px solid #f0e6e6;
  border-radius: var(--radius-sm);
}
input:focus {
  border-color: var(--violet);
  box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.3);
}
```

**Consola de código** — tema oscuro tipo terminal, contraste con el fondo claro:

```css
.console-out {
  background: #1e1e2e;            /* base oscura */
  color: #a6e3a1;                /* verde menta para la salida */
  font-family: 'Fira Code', monospace;
  border-radius: var(--radius-sm);
}
```

**Banners de resultado / pista** — fondo tintado suave + borde a juego:

```css
.result-banner--ok   { background: #d1fae5; color: var(--green-dark); border: 2px solid var(--green); }
.result-banner--fail { background: #fee2e2; color: #dc2626;          border: 2px solid #fca5a5; }
.hint-box            { background: #fef3c7; border: 2px solid var(--amber); }
```

**Barra de navegación** (`.topnav`) — translúcida con desenfoque, pegada arriba:

```css
.topnav {
  position: sticky; top: 0;
  height: 56px;
  background: rgba(255,247,237,0.88);
  backdrop-filter: blur(14px);
  border-bottom: 1.5px solid rgba(99,102,241,0.12);
}
```

Pestañas como píldoras (`border-radius: 999px`), avatar circular con anillo ámbar,
menú desplegable blanco con ítems redondeados; la opción "Cerrar sesión" usa rojo.

### 1.5 Bloques (editor visual)

El editor Blockly usa un tema cálido propio (`fablab`) coherente con la paleta,
con colores estilo Scratch por categoría:

| Categoría | Color |
|---|---|
| Texto / imprimir | `#7c3aed` violeta |
| Bucles | `#f59e0b` ámbar |
| Variables | `#10b981` verde |
| Matemáticas | `#0ea5e9` azul |
| Lógica | `#ef4444` rojo |
| Funciones | `#d946ef` magenta |

Lienzo `#fbf8f2`, toolbox `#ede8df`, renderer `zelos` (bloques redondeados).

---

## 2. Tema Admin (panel técnico)

Para el panel de administración (`/admin`). Estética de "panel de control":
densa, monoespaciada, con paneles planos de borde fino. Soporta **modo oscuro
(por defecto) y claro**, conmutables. Todos los tokens viven bajo `.admin-shell`
y se prefijan con `--adm-`.

### 2.1 Tokens — modo oscuro

```css
.admin-shell {
  /* Acento */
  --adm-accent:   #6366F1;   /* índigo */
  --adm-accent-2: #818CF8;

  /* Fondos (escala slate) */
  --adm-bg-primary:   #0f172a;
  --adm-bg-secondary: #1e293b;
  --adm-bg-tertiary:  #334155;
  --adm-panel:        #1a2332;

  /* Texto */
  --adm-text-primary:   #f1f5f9;
  --adm-text-secondary: #cbd5e1;
  --adm-text-tertiary:  #94a3b8;   /* = --adm-label */

  /* Bordes */
  --adm-border:       #475569;
  --adm-border-light: #334155;

  /* Estado */
  --adm-success: #10b981;
  --adm-warning: #f59e0b;
  --adm-error:   #ef4444;   /* = --adm-danger */

  /* Auxiliares de gráficos */
  --adm-track: rgba(255,255,255,0.06);   /* fondo de barras */
  --adm-soft:  rgba(99,102,241,0.18);    /* relleno tenue / badges */
}
```

### 2.2 Tokens — modo claro

```css
.admin-shell[data-theme="light"] {
  --adm-bg-primary:   #f8fafc;
  --adm-bg-secondary: #f1f5f9;
  --adm-bg-tertiary:  #e2e8f0;
  --adm-panel:        #f1f5f9;

  --adm-text-primary:   #1e293b;
  --adm-text-secondary: #475569;
  --adm-text-tertiary:  #64748b;

  --adm-border:       #cbd5e1;
  --adm-border-light: #e2e8f0;

  --adm-track: rgba(0,0,0,0.06);
  --adm-soft:  rgba(99,102,241,0.12);
}
```

El tema se aplica con `data-theme` en `.admin-shell` y se persiste en
`localStorage` (`adm-theme`), leído antes de hidratar para evitar parpadeo.

### 2.3 Tipografía

```css
--adm-font-display: Georgia, serif;                              /* números/centros de gráfico */
--adm-font-body:    system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
--adm-font-mono:    'Fira Code', 'Cascadia Code', 'Courier New', monospace;
```

Regla de uso: **etiquetas, métricas y datos en monospace**; títulos de panel en
sans. Las etiquetas de sección van en mayúsculas, ~9–10 px, con
`letter-spacing: 0.08–0.1em` y color `--adm-text-tertiary`.

### 2.4 Radios y forma

```css
--adm-radius:    12px;   /* paneles */
--adm-radius-sm: 6px;    /* controles, badges */
```

Sin sombras sólidas: aquí los paneles son **planos**, separados por bordes finos
(`0.5px solid var(--adm-border)`). Profundidad mínima; la jerarquía se logra con
fondo (`--adm-panel` sobre `--adm-bg-primary`) y bordes.

### 2.5 Componentes

**Panel** — contenedor base:

```css
background: var(--adm-panel);
border: 0.5px solid var(--adm-border);
border-radius: var(--adm-radius);
/* cabecera: padding 0.6rem 0.9rem, borde inferior 0.5px, título 13px + nota mono 10px */
```

**Tile / KPI** — métrica compacta: etiqueta mono 10 px + valor mono ~22 px peso 600
+ subtítulo 10 px (verde para normal, rojo para alerta).

**Barras de proporción** (dispositivos, navegadores, atascos):

```css
/* pista */ height: 6–7px; background: var(--adm-border); border-radius: 99px;
/* relleno */ background: var(--adm-accent) o rampa índigo;
```

**Badge "DEMO"** — marca datos de ejemplo:

```css
color: var(--adm-accent-2);
background: var(--adm-soft);
border: 1px solid var(--adm-border);
border-radius: 20px;
font: 9px mono, letter-spacing 0.12em;   /* "● DEMO" */
```

**Sidebar** — 170 px, grupos con cabecera (`MONITOREO` / `GESTIÓN` / `DEV`),
ítem activo con borde izquierdo `2px var(--adm-success)` y fondo
`--adm-bg-secondary`. Insignia de notificación = punto circular rojo.

### 2.6 Paleta de gráficos (Chart.js)

```js
INDIGO     = '#6366f1'
INDIGO_2   = '#818cf8'
INDIGO_RAMP = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#4f46e5']
AMBER      = '#fbbf24'
```

Convenciones: líneas con relieve (glow índigo), área con degradado vertical
(0.42 → 0 alpha), donuts con `cutout` 68–75 % y texto central en Georgia itálica.
Los lienzos deben usar `responsive: true` + `maintainAspectRatio: false` dentro de
un contenedor de altura fija (≈150–175 px) para no estirarse en pantallas anchas.

---

## 3. Transversal

### 3.1 Iconografía

- **Alumno**: emojis expresivos (🚀 🦊 ⭐ 🏆 💡 🧩) — refuerzan el tono lúdico.
- **Admin**: glifos geométricos monoespaciados (`▦ ◉ ↗ ◷ ◎ ◈ ◫ ⚙ ⟨/⟩`) —
  discretos y técnicos.

### 3.2 Movimiento

Transiciones cortas y físicas (0.05–0.2 s). El "hundido" del botón es la
animación insignia. **Siempre** respetar `prefers-reduced-motion`: las
animaciones de gráficos y Blockly se anulan bajo esa preferencia.

### 3.3 Accesibilidad

- Foco visible (halo violeta en formularios del alumno).
- Texto base nunca negro puro (`#3b2f2f` cálido) para suavizar el contraste.
- Lienzos de gráfico con `role="img"` y `aria-label` descriptivo.

### 3.4 Voz y tono

Español, cercano y motivador con el alumno ("¡Hola!", "¡Jugar!", "Siguiente
misión", "¡Sigue intentando!"). Conciso y neutro en el panel admin.

---

## 4. Resumen para portar a fablableon.org

Si solo se traslada **una** identidad al sitio público, usar el **Tema Alumno**:

1. Fondo: degradado cálido fijo `#fff7ed → #ffe4e6 → #ede9fe`.
2. Acentos: ámbar (acción), verde (logro), violeta (marca).
3. Forma: bordes de 3 px + sombra inferior **sólida** (`0 5px 0`), radios 20/14 px.
4. Tipografía sans con pesos 800–900 para títulos y botones.
5. Texto marrón cálido `#3b2f2f`, nunca negro puro.
6. Interacción táctil: el botón se hunde (`translateY` + sombra a 0) al pulsar.
