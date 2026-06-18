import type Database from 'better-sqlite3'

const SEED_VERSION = 2

export function seedCurriculum(db: Database.Database): void {
  const versionRow = db.prepare("SELECT value FROM settings WHERE key = 'seed_version'").get() as
    | { value: string }
    | undefined
  if ((versionRow ? Number(versionRow.value) : 0) >= SEED_VERSION) return

  db.prepare('DELETE FROM challenge_variants').run()
  db.prepare('DELETE FROM test_cases').run()
  db.prepare('DELETE FROM progress').run()
  db.prepare('DELETE FROM review_requests').run()
  db.prepare('DELETE FROM challenges').run()
  db.prepare('DELETE FROM concepts').run()

  seedAll(db)

  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('seed_version', ?)").run(
    String(SEED_VERSION),
  )
}

function concept(db: Database.Database, slug: string, name: string, description: string, ord: number): number {
  return Number(
    db.prepare('INSERT INTO concepts (slug, name, description, ord) VALUES (?, ?, ?, ?)').run(slug, name, description, ord).lastInsertRowid,
  )
}

function challenge(db: Database.Database, conceptId: number, slug: string, title: string, narrative: string, ord: number): number {
  return Number(
    db.prepare('INSERT INTO challenges (concept_id, slug, title, narrative, ord) VALUES (?, ?, ?, ?, ?)').run(conceptId, slug, title, narrative, ord).lastInsertRowid,
  )
}

function variant(db: Database.Database, cid: number, lang: string, statement: string, starter: string, hints: string[]): void {
  db.prepare('INSERT INTO challenge_variants (challenge_id, language, statement, starter_code, hints_json) VALUES (?, ?, ?, ?, ?)').run(cid, lang, statement, starter, JSON.stringify(hints))
}

function tc(db: Database.Database, cid: number, input: unknown, expected: string, ord: number): void {
  db.prepare('INSERT INTO test_cases (challenge_id, input_json, expected_output, ord) VALUES (?, ?, ?, ?)').run(cid, JSON.stringify(input), expected, ord)
}

function seedAll(db: Database.Database): void {
  // ── Fundamentos ──────────────────────────────────────────────────────────────
  const fund = concept(db, 'fundamentos', 'Fundamentos', 'Primeros pasos en programación', 0)

  const r1 = challenge(db, fund, 'saludo', 'Tu primer saludo', 'El ordenador puede hablar. ¡Hazle decir hola al mundo!', 0)
  variant(db, r1, 'js', 'Imprime exactamente: Hola mundo', 'print("...")', ['Usa print("Hola mundo")'])
  variant(db, r1, 'python', 'Imprime exactamente: Hola mundo', 'print("...")', ['Usa print("Hola mundo")'])
  variant(db, r1, 'blocks', 'Usa el bloque "Imprimir" para mostrar: Hola mundo', '', ['Busca el bloque verde "imprimir" en la categoría Imprimir'])
  tc(db, r1, null, 'Hola mundo', 0)

  const r2 = challenge(db, fund, 'mi-nombre', 'Me presento', 'Las variables guardan información. ¡Guarda tu nombre y preséntate!', 1)
  variant(db, r2, 'js', 'Crea una variable llamada nombre con el valor "Mundo" e imprime: Hola, Mundo', 'let nombre = "..."\nprint("Hola, " + nombre)', ['Asigna nombre = "Mundo"'])
  variant(db, r2, 'python', 'Crea una variable llamada nombre con el valor "Mundo" e imprime: Hola, Mundo', 'nombre = "..."\nprint("Hola, " + nombre)', ['Asigna nombre = "Mundo"'])
  variant(db, r2, 'blocks', 'Crea una variable "nombre" con valor "Mundo" y usa el bloque imprimir', '', ['Usa el bloque Variables'])
  tc(db, r2, null, 'Hola, Mundo', 0)

  const r3 = challenge(db, fund, 'suma', 'La gran suma', 'Los ordenadores son geniales calculando. ¡Súmame estos dos números!', 2)
  variant(db, r3, 'js', 'Dados input.a e input.b, imprime su suma', 'print(input.a + input.b)', ['Accede con input.a e input.b'])
  variant(db, r3, 'python', 'Dados input["a"] e input["b"], imprime su suma', 'print(input["a"] + input["b"])', ['Accede con input["a"] e input["b"]'])
  variant(db, r3, 'blocks', 'Imprime la suma de input.a e input.b', '', ['Usa el bloque de Matemáticas'])
  tc(db, r3, { a: 3, b: 7 }, '10', 0)
  tc(db, r3, { a: 0, b: 0 }, '0', 1)
  tc(db, r3, { a: 100, b: 250 }, '350', 2)

  const r4 = challenge(db, fund, 'doble', 'El número doble', 'Multiplica un número por 2. ¡Parece fácil, pero la máquina nunca se equivoca!', 3)
  variant(db, r4, 'js', 'Dado input.n, imprime su doble (n × 2)', 'print(input.n * 2)', ['Multiplica con *'])
  variant(db, r4, 'python', 'Dado input["n"], imprime su doble', 'print(input["n"] * 2)', ['Multiplica con *'])
  variant(db, r4, 'blocks', 'Imprime input.n multiplicado por 2', '', ['Usa el bloque de Matemáticas para multiplicar'])
  tc(db, r4, { n: 5 }, '10', 0)
  tc(db, r4, { n: 0 }, '0', 1)
  tc(db, r4, { n: 7 }, '14', 2)

  const r5 = challenge(db, fund, 'contar', 'Cuenta hasta el final', 'Los bucles repiten acciones. ¡Cuenta desde 1 hasta el número que te doy!', 4)
  variant(db, r5, 'js', 'Imprime "Hola N" para cada N de 1 a input.hasta (incluido), uno por línea', 'for (let i = 1; i <= input.hasta; i++) {\n  print("Hola " + i)\n}', ['Usa un bucle for'])
  variant(db, r5, 'python', 'Imprime "Hola N" para cada N de 1 a input["hasta"] (incluido), uno por línea', 'for i in range(1, input["hasta"] + 1):\n    print(f"Hola {i}")', ['range(1, n+1) incluye 1 y excluye n+1'])
  variant(db, r5, 'blocks', 'Usa un bucle "contar" para imprimir Hola 1, Hola 2, … hasta input.hasta', '', ['Categoría Bucles: bloque "contar de 1 a"'])
  tc(db, r5, { hasta: 10 }, Array.from({ length: 10 }, (_, i) => `Hola ${i + 1}`).join('\n'), 0)
  tc(db, r5, { hasta: 1 }, 'Hola 1', 1)

  // ── Condicionales ─────────────────────────────────────────────────────────────
  const cond = concept(db, 'condicionales', 'Condicionales', 'Toma decisiones con if / else', 1)

  const r6 = challenge(db, cond, 'par-impar', 'Par o impar', '¿Es par o impar? El truco está en el resto de la división.', 0)
  variant(db, r6, 'js', 'Dado input.n, imprime "par" si es par, "impar" si no', 'if (input.n % 2 === 0) {\n  print("par")\n} else {\n  print("impar")\n}', ['El operador % da el resto; si n % 2 es 0, es par'])
  variant(db, r6, 'python', 'Dado input["n"], imprime "par" si es par, "impar" si no', 'if input["n"] % 2 == 0:\n    print("par")\nelse:\n    print("impar")', ['En Python if lleva : al final'])
  tc(db, r6, { n: 4 }, 'par', 0)
  tc(db, r6, { n: 7 }, 'impar', 1)
  tc(db, r6, { n: 0 }, 'par', 2)

  const r7 = challenge(db, cond, 'signo', 'El signo del número', 'Los números pueden ser positivos, negativos o cero. ¡Clasifícalos!', 1)
  variant(db, r7, 'js', 'Dado input.n, imprime "positivo", "negativo" o "cero"', 'if (input.n > 0) {\n  print("positivo")\n} else if (input.n < 0) {\n  print("negativo")\n} else {\n  print("cero")\n}', ['Usa if / else if / else para tres casos'])
  variant(db, r7, 'python', 'Dado input["n"], imprime "positivo", "negativo" o "cero"', 'n = input["n"]\nif n > 0:\n    print("positivo")\nelif n < 0:\n    print("negativo")\nelse:\n    print("cero")', ['elif es equivalente a else if'])
  tc(db, r7, { n: 5 }, 'positivo', 0)
  tc(db, r7, { n: -3 }, 'negativo', 1)
  tc(db, r7, { n: 0 }, 'cero', 2)

  const r8 = challenge(db, cond, 'mayor-dos', 'El campeón', '¿Quién es mayor? Compara dos números y di cuál es más grande.', 2)
  variant(db, r8, 'js', 'Dados input.a e input.b, imprime el mayor. Si son iguales, imprime cualquiera.', 'if (input.a >= input.b) {\n  print(input.a)\n} else {\n  print(input.b)\n}', ['Usa >='])
  variant(db, r8, 'python', 'Dados input["a"] e input["b"], imprime el mayor.', 'a, b = input["a"], input["b"]\nif a >= b:\n    print(a)\nelse:\n    print(b)', ['Puedes desempaquetar: a, b = ...'])
  tc(db, r8, { a: 8, b: 3 }, '8', 0)
  tc(db, r8, { a: 2, b: 9 }, '9', 1)
  tc(db, r8, { a: 5, b: 5 }, '5', 2)

  const r9 = challenge(db, cond, 'fizzbuzz', 'FizzBuzz', 'El reto clásico de los programadores. ¡Múltiplos de 3 y 5 tienen secretos!', 3)
  variant(db, r9, 'js', 'Imprime los números de 1 a input.hasta. Múltiplos de 3→"Fizz", de 5→"Buzz", de ambos→"FizzBuzz".', 'for (let i = 1; i <= input.hasta; i++) {\n  if (i % 15 === 0) print("FizzBuzz")\n  else if (i % 3 === 0) print("Fizz")\n  else if (i % 5 === 0) print("Buzz")\n  else print(i)\n}', ['Comprueba primero múltiplos de 15', 'Usa el operador %'])
  variant(db, r9, 'python', 'Imprime los números de 1 a input["hasta"]. Múltiplos de 3→"Fizz", de 5→"Buzz", de ambos→"FizzBuzz".', 'for i in range(1, input["hasta"] + 1):\n    if i % 15 == 0:\n        print("FizzBuzz")\n    elif i % 3 == 0:\n        print("Fizz")\n    elif i % 5 == 0:\n        print("Buzz")\n    else:\n        print(i)', ['Comprueba el caso de 15 primero'])
  tc(db, r9, { hasta: 15 }, ['1','2','Fizz','4','Buzz','Fizz','7','8','Fizz','Buzz','11','Fizz','13','14','FizzBuzz'].join('\n'), 0)
  tc(db, r9, { hasta: 3 }, '1\n2\nFizz', 1)

  // ── Bucles ────────────────────────────────────────────────────────────────────
  const loops = concept(db, 'bucles', 'Bucles', 'Repite acciones de forma eficiente', 2)

  const r10 = challenge(db, loops, 'suma-rango', 'La suma perfecta', 'Acumula los números de 1 hasta N. ¡Los bucles hacen el trabajo pesado!', 0)
  variant(db, r10, 'js', 'Imprime la suma de todos los números de 1 a input.n (incluido)', 'let suma = 0\nfor (let i = 1; i <= input.n; i++) {\n  suma = suma + i\n}\nprint(suma)', ['Usa una variable acumuladora inicializada a 0'])
  variant(db, r10, 'python', 'Imprime la suma de todos los números de 1 a input["n"] (incluido)', 'suma = 0\nfor i in range(1, input["n"] + 1):\n    suma = suma + i\nprint(suma)', ['Acumula antes del bucle'])
  tc(db, r10, { n: 5 }, '15', 0)
  tc(db, r10, { n: 10 }, '55', 1)
  tc(db, r10, { n: 1 }, '1', 2)

  const r11 = challenge(db, loops, 'tabla-multiplicar', 'La tabla del saber', 'Genera la tabla de multiplicar de cualquier número. ¡Del 1 al 10!', 1)
  variant(db, r11, 'js', 'Imprime la tabla de multiplicar de input.n del 1 al 10. Formato: "N x I = RESULTADO"', 'for (let i = 1; i <= 10; i++) {\n  print(input.n + " x " + i + " = " + (input.n * i))\n}', ['Combina strings y números con +'])
  variant(db, r11, 'python', 'Imprime la tabla de multiplicar de input["n"] del 1 al 10. Formato: "N x I = RESULTADO"', 'for i in range(1, 11):\n    n = input["n"]\n    print(f"{n} x {i} = {n * i}")', ['Usa f-strings: f"{n} x {i} = {n*i}"'])
  tc(db, r11, { n: 3 }, Array.from({ length: 10 }, (_, i) => `3 x ${i+1} = ${3*(i+1)}`).join('\n'), 0)
  tc(db, r11, { n: 1 }, Array.from({ length: 10 }, (_, i) => `1 x ${i+1} = ${i+1}`).join('\n'), 1)

  const r12 = challenge(db, loops, 'invertir', 'Al revés', 'Imprime los elementos de una lista en orden inverso.', 2)
  variant(db, r12, 'js', 'Dado input.items (array de números), imprímelos de mayor índice a menor, uno por línea.', 'for (let i = input.items.length - 1; i >= 0; i--) {\n  print(input.items[i])\n}', ['Empieza en items.length - 1', 'Decrementa con i--'])
  variant(db, r12, 'python', 'Dado input["items"] (lista de números), imprímelos en orden inverso, uno por línea.', 'items = input["items"]\nfor i in range(len(items) - 1, -1, -1):\n    print(items[i])', ['range(len-1, -1, -1) recorre al revés'])
  tc(db, r12, { items: [1, 2, 3] }, '3\n2\n1', 0)
  tc(db, r12, { items: [10, 20] }, '20\n10', 1)
  tc(db, r12, { items: [7] }, '7', 2)

  const r13 = challenge(db, loops, 'contar-pares', 'Solo los pares', 'Filtra y cuenta solo los números pares de una lista.', 3)
  variant(db, r13, 'js', 'Dado input.items, imprime solo los números pares, uno por línea.', 'for (let i = 0; i < input.items.length; i++) {\n  if (input.items[i] % 2 === 0) {\n    print(input.items[i])\n  }\n}', ['Combina un bucle con un condicional'])
  variant(db, r13, 'python', 'Dado input["items"], imprime solo los números pares, uno por línea.', 'for x in input["items"]:\n    if x % 2 == 0:\n        print(x)', ['Itera directamente con for x in lista'])
  tc(db, r13, { items: [1,2,3,4,5,6] }, '2\n4\n6', 0)
  tc(db, r13, { items: [1,3,5] }, '', 1)
  tc(db, r13, { items: [2,4] }, '2\n4', 2)

  // ── Funciones ─────────────────────────────────────────────────────────────────
  const funcs = concept(db, 'funciones', 'Funciones', 'Organiza tu código en bloques reutilizables', 3)

  const r14 = challenge(db, funcs, 'funcion-saludo', 'Mi primera función', 'Las funciones son como mini-programas que puedes llamar cuando quieras.', 0)
  variant(db, r14, 'js', 'Crea una función "saludar(nombre)" que retorne "Hola, NOMBRE!". Llámala con input.nombre e imprime el resultado.', 'function saludar(nombre) {\n  return "Hola, " + nombre + "!"\n}\nprint(saludar(input.nombre))', ['Define la función antes de llamarla', 'Usa return'])
  variant(db, r14, 'python', 'Crea una función "saludar(nombre)" que retorne "Hola, NOMBRE!". Llámala con input["nombre"] e imprime el resultado.', 'def saludar(nombre):\n    return "Hola, " + nombre + "!"\nprint(saludar(input["nombre"]))', ['En Python usa def'])
  tc(db, r14, { nombre: 'Ana' }, 'Hola, Ana!', 0)
  tc(db, r14, { nombre: 'Mundo' }, 'Hola, Mundo!', 1)

  const r15 = challenge(db, funcs, 'potencia', 'La potencia de los bucles', 'Calcula una potencia multiplicando repetidamente, sin usar funciones de ayuda.', 1)
  variant(db, r15, 'js', 'Crea "potencia(base, exp)" que retorne base^exp con un bucle. Imprime potencia(input.base, input.exp).', 'function potencia(base, exp) {\n  let resultado = 1\n  for (let i = 0; i < exp; i++) {\n    resultado = resultado * base\n  }\n  return resultado\n}\nprint(potencia(input.base, input.exp))', ['Multiplica base por sí misma "exp" veces', 'Empieza en 1'])
  variant(db, r15, 'python', 'Crea "potencia(base, exp)" que retorne base^exp con un bucle. Imprime potencia(input["base"], input["exp"]).', 'def potencia(base, exp):\n    resultado = 1\n    for i in range(exp):\n        resultado = resultado * base\n    return resultado\nprint(potencia(input["base"], input["exp"]))', ['range(exp) ejecuta el cuerpo exp veces'])
  tc(db, r15, { base: 2, exp: 10 }, '1024', 0)
  tc(db, r15, { base: 3, exp: 3 }, '27', 1)
  tc(db, r15, { base: 5, exp: 0 }, '1', 2)

  const r16 = challenge(db, funcs, 'es-primo', '¿Primo o no primo?', 'Los números primos son especiales: solo se dividen por 1 y por sí mismos.', 2)
  variant(db, r16, 'js', 'Crea "esPrimo(n)" que retorne true/false. Imprime "primo" o "no primo" para input.n.', 'function esPrimo(n) {\n  if (n < 2) return false\n  for (let i = 2; i * i <= n; i++) {\n    if (n % i === 0) return false\n  }\n  return true\n}\nprint(esPrimo(input.n) ? "primo" : "no primo")', ['Comprueba divisores hasta la raíz cuadrada', 'Si n < 2 no es primo'])
  variant(db, r16, 'python', 'Crea "es_primo(n)" que retorne True/False. Imprime "primo" o "no primo" para input["n"].', 'def es_primo(n):\n    if n < 2:\n        return False\n    i = 2\n    while i * i <= n:\n        if n % i == 0:\n            return False\n        i = i + 1\n    return True\nn = input["n"]\nprint("primo" if es_primo(n) else "no primo")', ['Comprueba hasta que i*i > n'])
  tc(db, r16, { n: 7 }, 'primo', 0)
  tc(db, r16, { n: 10 }, 'no primo', 1)
  tc(db, r16, { n: 2 }, 'primo', 2)
  tc(db, r16, { n: 1 }, 'no primo', 3)
}
