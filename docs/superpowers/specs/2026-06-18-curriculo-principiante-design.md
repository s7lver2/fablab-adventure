# Rediseño del currículo: rampa para principiantes absolutos

**Fecha:** 2026-06-18
**Estado:** Aprobado, pendiente de plan de implementación

## Problema

El currículo actual ([src/lib/curriculum/seed.ts](../../../src/lib/curriculum/seed.ts)) salta
demasiado rápido para alguien que **nunca ha programado**:

- Los retos 1-2 imprimen texto literal, pero el **reto 3 ("La gran suma")** introduce
  de golpe la variable mágica `input.a` / `input.b` sin ninguna explicación previa.
- Para el reto 6 ("Par o impar") el alumno ya tiene que entender
  `if (input.n % 2 === 0) { ... } else { ... }` — operador módulo, comparación,
  condicional y la variable `input` a la vez.

Objetivo: que se pueda completar la plataforma **partiendo de cero**, con una rampa
mucho más suave al principio, y a la vez **añadir lecciones avanzadas** para subir
la dificultad al final.

## Decisiones tomadas (brainstorming)

1. **El `input` se aprende como tema propio.** Las primeras lecciones NO usan `input`:
   todo son números y textos escritos a mano. `input` se presenta en su propio bloque,
   con calma, apoyándose en lo ya aprendido.
2. **Las 3 versiones (JS / Python / Bloques) en todas las lecciones nuevas.**
3. **Nivel avanzado = mini-proyectos** que combinan todo lo aprendido, adaptados a la
   corrección automática (entrada → salida esperada, no interactivos).

## Estructura final (28 lecciones, 7 conceptos)

Leyenda: 🆕 = lección nueva · *(existe)* = reto actual reutilizado.

### Concepto 0 — `primeros-pasos` "Primeros pasos" (sin `input`)
1. `saludo` — Tu primer saludo *(existe)*
2. 🆕 `varias-lineas` — Línea a línea (varios `print`)
3. 🆕 `imprimir-numeros` — Números en pantalla (`print(7)`, sin comillas)
4. 🆕 `primera-cuenta` — Tu primera cuenta (`print(2 + 3)`)
5. 🆕 `operaciones` — Restar, multiplicar y dividir (números literales)

### Concepto 1 — `variables` "Cajas (variables)" (sin `input`)
6. 🆕 `guardar-numero` — Una caja con un número (`let edad = 10`)
7. `mi-nombre` — Me presento *(existe, se mueve aquí)*
8. 🆕 `caja-cuenta` — Cuentas con cajas (`let a = 5; let b = 3; a + b`)
9. 🆕 `juntar-textos` — Pegar textos (combinar textos y cajas)

### Concepto 2 — `datos-input` "Datos que llegan (input)" (presenta `input`)
10. 🆕 `que-es-input` — ¿Qué es un dato que llega? (un solo `input`, muy explicado)
11. `suma` — La gran suma *(existe)*
12. `doble` — El número doble *(existe)*

### Concepto 3 — `condicionales` "Decisiones (if / else)"
13. 🆕 `si-o-no` — ¿Sí o no? (un `if` muy simple, p. ej. mayor/menor de edad)
14. `par-impar` — Par o impar *(existe)*
15. `signo` — El signo del número *(existe)*
16. `mayor-dos` — El campeón *(existe)*
17. `fizzbuzz` — FizzBuzz *(existe)*

### Concepto 4 — `bucles` "Bucles (repetir)"
18-22. `contar`, `suma-rango`, `tabla-multiplicar`, `invertir`, `contar-pares` *(existen)*

### Concepto 5 — `funciones` "Funciones"
23-25. `funcion-saludo`, `potencia`, `es-primo` *(existen)*

### Concepto 6 — `proyectos` "Mini-proyectos" (avanzado, nuevo)
26. 🆕 `calculadora` — recibe `{a, operacion, b}` y muestra el resultado.
    Combina variables + condicionales para elegir `+ − × ÷`.
27. 🆕 `validador-contrasena` — recibe una palabra y muestra `"segura"` / `"débil"`
    según reglas (longitud mínima, contiene un número…). Texto + condicionales + bucle.
28. 🆕 `adivina-numero` — recibe un número secreto y una lista de intentos; por cada
    intento imprime `"más alto"`, `"más bajo"` o `"¡acertaste!"`. Listas + bucle + condicionales.

**Total: 12 lecciones nuevas**, cada una con variantes JS, Python y Bloques + casos de prueba.

## La clave: introducción de `input`

Hasta la lección 10, cero `input`. El alumno solo ve valores que escribe él mismo
(`let edad = 10`), que ya entiende como "cajas". La lección 10 lo presenta como una
caja especial cuyo contenido lo pone la plataforma:

> "Hasta ahora tú escribías los valores. Ahora te los damos nosotros, guardados en una
> caja especial que se llama `input`. Para sacar el número de dentro escribes `input.n`."

La lección 10 solo **lee** un dato y lo muestra reutilizando la concatenación ya
aprendida (`"Tu número es " + input.n`). Nada de `%`, nada de `if`.

## Convenciones de tono (todas las lecciones nuevas)

- Frases cortas; **una sola idea nueva** por lección.
- Analogías ya usadas en el repo: cajas (variables), piezas de puzle (bloques).
- Mismo formato de enunciado que ya existe: `👉` para la pista de código, `🧩` para bloques.
- Casos de prueba: al menos 2-3 por reto, cubriendo el caso normal y algún borde.

## Implementación

- Todo el cambio vive en [src/lib/curriculum/seed.ts](../../../src/lib/curriculum/seed.ts):
  se reescribe `seedAll` con los 7 conceptos y el nuevo orden (`ord` consecutivo).
- Subir `SEED_VERSION` de **5 → 6**. Esto dispara el re-seed, que **borra el progreso
  guardado** (mismo comportamiento que en subidas de versión anteriores: el `seed`
  hace `DELETE` de progreso, variantes, casos, retos y conceptos antes de re-sembrar).
- Las variantes de **Bloques** deben usar **solo** piezas ya presentes en
  [src/lib/engine/blocks/toolbox.ts](../../../src/lib/engine/blocks/toolbox.ts).
  Verificar contra el toolbox al implementar cada bloque nuevo; si alguna lección
  necesitara una pieza inexistente, simplificar el enunciado para usar las disponibles.
- **Sin cambios** en la UI ni en el motor de ejecución: es solo contenido de datos.

## Fuera de alcance (YAGNI)

- No se añade material teórico separado (las narrativas de cada reto siguen siendo la teoría).
- No se cambia el modelo de corrección (entrada JSON → salida esperada por texto).
- No se tocan los lenguajes soportados ni el toolbox de bloques.

## Riesgos

- **Pérdida de progreso de usuarios** al subir `SEED_VERSION`. Aceptable: ya ocurría en
  versiones previas y la plataforma está en desarrollo.
- El validador de contraseñas y "adivina el número" usan operaciones de texto/listas que
  hoy solo se enseñan parcialmente; al ser nivel avanzado, las pistas deben llevar de la
  mano esos detalles. Verificar que las piezas de bloques necesarias existen.
