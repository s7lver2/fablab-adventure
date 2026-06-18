import type Database from 'better-sqlite3'

const SEED_VERSION = 6

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
  // ── 7 Conceptos del Currículum ──────────────────────────────────────────────

  // Concepto 0: Primeros pasos
  const paso = concept(db, 'primeros-pasos', 'Primeros pasos', 'Tus primeras órdenes: imprimir y calcular', 0)

  // Concepto 1: Variables
  const vars = concept(db, 'variables', 'Cajas para guardar', 'Guarda valores en variables y úsalos', 1)

  // Concepto 2: Datos de entrada
  const datos = concept(db, 'datos-input', 'Datos que llegan', 'Programas que reciben información de fuera', 2)

  // Concepto 3: Condicionales
  const cond = concept(db, 'condicionales', 'Decisiones', 'Toma decisiones con if / else', 3)

  // Concepto 4: Bucles
  const loops = concept(db, 'bucles', 'Bucles', 'Repite acciones de forma eficiente', 4)

  // Concepto 5: Funciones
  const funcs = concept(db, 'funciones', 'Funciones', 'Organiza tu código en bloques reutilizables', 5)

  // Concepto 6: Proyectos
  const proyectos = concept(db, 'proyectos', 'Mini-proyectos', 'Combina todo lo aprendido', 6)

  // ── Primeros pasos (paso, ord 0) ────────────────────────────────────────────

  const r1 = challenge(db, paso, 'saludo', 'Tu primer saludo', 'Un programa es una lista de órdenes que el ordenador obedece una a una. La orden más útil para empezar es IMPRIMIR: muestra en pantalla el texto que le des. ¡Hagamos que salude al mundo!', 0)
  variant(db, r1, 'js', 'Escribe en pantalla, exactamente: Hola mundo\n\n👉 print("texto") muestra lo que pongas entre las comillas. Las comillas marcan dónde empieza y termina el texto, pero no se muestran.', 'print("...")', ['print() es la orden para mostrar texto. Sustituye los puntos por tu mensaje.', 'Escribe el texto entre comillas: print("Hola mundo")', 'Cuidado con las mayúsculas y el espacio: debe ser "Hola mundo", ni "hola mundo" ni "Holamundo".'])
  variant(db, r1, 'python', 'Escribe en pantalla, exactamente: Hola mundo\n\n👉 print("texto") muestra lo que pongas entre las comillas. Las comillas marcan dónde empieza y termina el texto, pero no se muestran.', 'print("...")', ['print() es la orden para mostrar texto. Sustituye los puntos por tu mensaje.', 'Escribe el texto entre comillas: print("Hola mundo")', 'Cuidado con las mayúsculas y el espacio: debe ser "Hola mundo".'])
  variant(db, r1, 'blocks', 'Haz que la pantalla muestre: Hola mundo\n\n🧩 Necesitas 2 bloques que encajan como piezas de puzle:\n• El bloque morado «imprimir» (categoría Imprimir).\n• El bloque de texto « " " » que se mete DENTRO del hueco del bloque imprimir.', '', ['Abre la categoría morada «Imprimir» y arrastra el bloque «imprimir» al área de trabajo.', 'De la misma categoría, arrastra el bloque de texto « " " » y encájalo en el hueco redondo del bloque «imprimir».', 'Haz clic dentro del bloque de texto y escribe Hola mundo (con la H mayúscula y un espacio en medio).'])
  tc(db, r1, null, 'Hola mundo', 0)

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

  // ── Variables (vars, ord 1) ─────────────────────────────────────────────────

  const v1 = challenge(db, vars, 'guardar-numero', 'Guardar un número', 'Una VARIABLE es como una cajita con una etiqueta: le pones un nombre y guardas algo dentro. Después puedes usar ese valor solo con escribir el nombre de la caja. Vamos a guardar un número y mostrarlo.', 0)
  variant(db, v1, 'js', 'Crea una variable llamada edad que valga 10 y muestra el valor de esa variable.\n\n👉 let edad = 10 crea la caja. print(edad) la abre y muestra lo que hay dentro.', 'let edad = ...\nprint(...)', ['Guarda el valor en la caja: let edad = 10', 'Muestra el contenido de la caja: print(edad) (SIN comillas)', 'Debe salir solo: 10'])
  variant(db, v1, 'python', 'Crea una variable llamada edad que valga 10 y muestra el valor de esa variable.\n\n👉 edad = 10 crea la caja. print(edad) la abre y muestra lo que hay dentro.', 'edad = ...\nprint(...)', ['Guarda el valor en la caja: edad = 10', 'Muestra el contenido de la caja: print(edad) (SIN comillas)', 'Debe salir solo: 10'])
  variant(db, v1, 'blocks', 'Guarda 10 en una caja llamada edad y muestra el valor de esa variable.\n\n🧩 En «Variables» pulsa «Crear variable…» y llámala edad (aparecen «poner [edad] a» y «[edad]»). Usa «poner [edad] a» con un número 10 dentro, luego «imprimir» con la variable «[edad]» en su interior.', '', ['En «Variables» crea edad usando «Crear variable…»', 'Arrastra «poner [edad] a» y mete dentro un número 10.', 'Después arrastra «imprimir» con la variable «[edad]» dentro.'])
  tc(db, v1, null, '10', 0)

  const v2 = challenge(db, vars, 'caja-cuenta', 'Cajas que calculan', 'Ahora que sabes guardar números, puedes hacer cuentas CON los números guardados en cajas. Si guardas el 5 en una caja a y el 3 en la caja b, puedes sumarlas: a + b te da 8. ¡Los números de las cajas se operan como los números normales!', 2)
  variant(db, v2, 'js', 'Crea dos variables: a = 5 y b = 3. Suma los valores de ambas cajas y muestra el resultado.\n\n👉 Cuando usas a + b, el ordenador toma el 5 y el 3 de las cajas y suma: 5 + 3 = 8.', 'let a = 5\nlet b = 3\nprint(a + b)', ['Guarda dos valores: let a = 5 y let b = 3', 'El signo + suma directamente: a + b suma el contenido de ambas cajas.', 'Debe salir 8.'])
  variant(db, v2, 'python', 'Crea dos variables: a = 5 y b = 3. Suma los valores de ambas cajas y muestra el resultado.\n\n👉 Cuando usas a + b, el ordenador toma el 5 y el 3 de las cajas y suma: 5 + 3 = 8.', 'a = 5\nb = 3\nprint(a + b)', ['Guarda dos valores: a = 5 y b = 3', 'El signo + suma directamente: a + b suma el contenido de ambas cajas.', 'Debe salir 8.'])
  variant(db, v2, 'blocks', 'Crea dos variables: a = 5 y b = 3. Suma sus valores y muestra el resultado.\n\n🧩 En «Variables» crea las variables a y b. Luego usa dos bloques «poner [a] a» y «poner [b] a» con números dentro. Finalmente, con «imprimir», suma los dos bloques verdes «[a]» y «[b]» usando un bloque de operación de «Matemáticas».', '', ['En «Variables» crea a y b (pulsa «Crear variable…» dos veces).', 'Arrastra «poner [a] a 5» y «poner [b] a 3».', 'En «Matemáticas» coge el bloque de operación y pon un bloque «[a]» en un hueco y un bloque «[b]» en el otro. Encája eso en «imprimir».'])
  tc(db, v2, null, '8', 0)

  const v3 = challenge(db, vars, 'juntar-textos', 'Juntar cajas de texto', 'Los textos también pueden vivir en cajas (variables). El signo + no solo suma números: también PEGA textos. "Hola, " + "Lia" se convierte en "Hola, Lia". Vamos a guardar un nombre en una caja y pegarlo a un saludo.', 3)
  variant(db, v3, 'js', 'Crea una variable nombre = "Lia" y muestra: Hola, Lia. ¿Qué tal?\n\n👉 print("Hola, " + nombre + ". ¿Qué tal?") pega el texto con el valor de la caja.', 'let nombre = "Lia"\nprint("Hola, " + nombre + ". ¿Qué tal?")', ['Guarda el texto: let nombre = "Lia"', 'Pega textos con +: "Hola, " + nombre + ". ¿Qué tal?"', 'Cuida los espacios y la puntuación: exacto debe ser "Hola, Lia. ¿Qué tal?"'])
  variant(db, v3, 'python', 'Crea una variable nombre = "Lia" y muestra: Hola, Lia. ¿Qué tal?\n\n👉 print("Hola, " + nombre + ". ¿Qué tal?") pega el texto con el valor de la caja.', 'nombre = "Lia"\nprint("Hola, " + nombre + ". ¿Qué tal?")', ['Guarda el texto: nombre = "Lia"', 'Pega textos con +: "Hola, " + nombre + ". ¿Qué tal?"', 'Cuida los espacios y la puntuación: exacto debe ser "Hola, Lia. ¿Qué tal?"'])
  variant(db, v3, 'blocks', 'Guarda "Lia" en una caja llamada nombre y muestra: Hola, Lia. ¿Qué tal?\n\n🧩 En «Variables» crea nombre. Luego usa «poner [nombre] a» con un texto «Lia» dentro. Con «imprimir» y «combinar textos», pega «Hola, », la variable «[nombre]» y «. ¿Qué tal?» (¡con el punto delante!).', '', ['En «Variables» crea nombre.', 'Usa «poner [nombre] a» con un bloque de texto «Lia» dentro.', 'En «Imprimir» coge «combinar textos» (o encadena varios); pega en orden: un texto «Hola, », luego la variable «[nombre]», luego un texto «. ¿Qué tal?» (con punto y espacio).'])
  tc(db, v3, null, 'Hola, Lia. ¿Qué tal?', 0)

  const r2 = challenge(db, vars, 'mi-nombre', 'Me presento', 'Una VARIABLE es como una cajita con una etiqueta: le pones un nombre y guardas algo dentro. Después puedes usar ese valor solo con escribir el nombre de la caja. Vamos a guardar un nombre y mostrarlo.', 1)
  variant(db, r2, 'js', 'Crea una variable llamada nombre que valga "Mundo" y muestra: Hola, Mundo\n\n👉 let nombre = "Mundo" crea la caja. Con + puedes pegar dos textos: "Hola, " + nombre.', 'let nombre = "..."\nprint("Hola, " + nombre)', ['Guarda el valor en la caja: let nombre = "Mundo"', 'El signo + une (pega) dos textos: "Hola, " + nombre', 'Fíjate en la coma y el espacio: debe salir "Hola, Mundo".'])
  variant(db, r2, 'python', 'Crea una variable llamada nombre que valga "Mundo" y muestra: Hola, Mundo\n\n👉 nombre = "Mundo" crea la caja. Con + puedes pegar dos textos: "Hola, " + nombre.', 'nombre = "..."\nprint("Hola, " + nombre)', ['Guarda el valor en la caja: nombre = "Mundo"', 'El signo + une (pega) dos textos: "Hola, " + nombre', 'Fíjate en la coma y el espacio: debe salir "Hola, Mundo".'])
  variant(db, r2, 'blocks', 'Guarda "Mundo" en una caja llamada nombre y muestra: Hola, Mundo\n\n🧩 En «Variables» pulsa «Crear variable…» y llámala nombre (aparecen «poner [nombre] a» y «[nombre]»). En «Imprimir» tienes «combinar textos», que une dos trozos en uno.', '', ['En «Variables» crea nombre y usa «poner [nombre] a» con un texto «Mundo» dentro.', 'En «Imprimir» coge «combinar textos»: en el primer hueco un texto «Hola, » y en el segundo el bloque verde «[nombre]».', 'Mete ese «combinar textos» dentro de «imprimir». Cuida la coma y el espacio: «Hola, ».'])
  tc(db, r2, null, 'Hola, Mundo', 0)

  // ── Datos de entrada (datos, ord 2) ────────────────────────────────────────

  const q1 = challenge(db, datos, 'que-es-input', '¿Qué es input?', 'El ordenador recibe datos en una caja especial llamada input, como si fuera una "caja de regalos" que viene del mundo exterior. No la creamos nosotros: ¡llega lista con datos dentro! En este reto input trae un número en input.n. Solo tienes que mostrarlo, pegado a un texto de bienvenida.', 0)
  variant(db, q1, 'js', 'Muestra el texto: Tu número es N, donde N es el número que viene en input.n.\n\n👉 input.n es una caja que alguien ya llenó por ti. No la crées: úsala. Con + pegas el texto y el número.', 'print("Tu número es " + input.n)', ['input.n es una caja que ya tiene un número dentro.', 'Pega el texto "Tu número es " con input.n usando +.', 'Debe salir exacto: Tu número es 7 (si input.n vale 7).'])
  variant(db, q1, 'python', 'Muestra el texto: Tu número es N, donde N es el número que viene en input["n"].\n\n👉 input["n"] es una caja que alguien ya llenó por ti. No la crées: úsala. Una f-string mete el número en el texto.', 'print(f"Tu número es {input[\'n\']}")', ['input["n"] es una caja que ya tiene un número dentro.', 'Usa una f-string: f"Tu número es {input[\'n\']}"', 'Debe salir exacto: Tu número es 7 (si input["n"] vale 7).'])
  variant(db, q1, 'blocks', 'Muestra el texto: Tu número es N, donde N es el número de input.n.\n\n🧩 En «Datos» tienes el bloque «dato __»: escribe n dentro. Con «combinar textos» pega el texto "Tu número es " con el número que viene en el bloque «dato n».', '', ['De «Datos» coge el bloque «dato __» y escribe n dentro.', 'De «Imprimir» coge «combinar textos»: primer hueco el texto "Tu número es ", segundo hueco el bloque «dato n».', 'Mete «combinar textos» dentro de «imprimir».'])
  tc(db, q1, { n: 7 }, 'Tu número es 7', 0)
  tc(db, q1, { n: 100 }, 'Tu número es 100', 1)

  const r3 = challenge(db, datos, 'suma', 'La gran suma', 'El ordenador recibe datos en una caja especial llamada input. En este reto input trae dos números: input.a e input.b. ¡Tu trabajo es sumarlos y mostrar el resultado!', 1)
  variant(db, r3, 'js', 'Suma input.a + input.b y muestra el resultado.\n\n👉 input.a es el primer número e input.b el segundo. El signo + suma números.', 'print(input.a + input.b)', ['Lee los dos números con input.a e input.b', 'El signo + suma dos números: input.a + input.b', 'Mete la suma dentro de print(...) para mostrarla.'])
  variant(db, r3, 'python', 'Suma input["a"] + input["b"] y muestra el resultado.\n\n👉 input["a"] es el primer número e input["b"] el segundo. El signo + suma números.', 'print(input["a"] + input["b"])', ['Lee los dos números con input["a"] e input["b"]', 'El signo + suma dos números: input["a"] + input["b"]', 'Mete la suma dentro de print(...) para mostrarla.'])
  variant(db, r3, 'blocks', 'Muestra la suma de input.a e input.b.\n\n🧩 En la categoría rosa «Datos» está el bloque «dato __»: escribe dentro a o b para leer cada número. El bloque azul de operación («Matemáticas») los suma con el signo +.', '', ['De «Datos» arrastra dos bloques «dato __»: en uno escribe a y en el otro b.', 'En «Matemáticas» coge el bloque de operación, deja el signo en + y mete un «dato» en cada hueco.', 'Mete todo el bloque de suma dentro de «imprimir».'])
  tc(db, r3, { a: 3, b: 7 }, '10', 0)
  tc(db, r3, { a: 0, b: 0 }, '0', 1)
  tc(db, r3, { a: 100, b: 250 }, '350', 2)

  const r4 = challenge(db, datos, 'doble', 'El número doble', 'Multiplicar por 2 es calcular el doble. Usaremos otra vez el bloque de operación de Matemáticas, pero esta vez eligiendo el signo × (por). Recibes el número en input.n.', 2)
  variant(db, r4, 'js', 'Muestra el doble de input.n (es decir, input.n × 2).\n\n👉 En código, multiplicar se escribe con el asterisco *, no con la x.', 'print(input.n * 2)', ['Multiplicar se escribe con * (asterisco): input.n * 2', 'Doble significa "por 2".', 'Recuerda mostrar el resultado con print(...).'])
  variant(db, r4, 'python', 'Muestra el doble de input["n"] (es decir, input["n"] × 2).\n\n👉 En código, multiplicar se escribe con el asterisco *, no con la x.', 'print(input["n"] * 2)', ['Multiplicar se escribe con * (asterisco): input["n"] * 2', 'Doble significa "por 2".', 'Recuerda mostrar el resultado con print(...).'])
  variant(db, r4, 'blocks', 'Muestra input.n multiplicado por 2.\n\n🧩 Lee el número con el bloque «dato __» (escribe n) de la categoría rosa «Datos». Luego, en «Matemáticas», cambia el signo del bloque de operación a × (multiplicar).', '', ['De «Datos» coge «dato __» y escribe n dentro.', 'En «Matemáticas» coge el bloque de operación y en su menú elige × (multiplicar).', 'Pon «dato n» en un hueco y un 2 en el otro; mételo todo dentro de «imprimir».'])
  tc(db, r4, { n: 5 }, '10', 0)
  tc(db, r4, { n: 0 }, '0', 1)
  tc(db, r4, { n: 7 }, '14', 2)

  // ── Condicionales (cond, ord 3) ─────────────────────────────────────────────

  const r5b = challenge(db, cond, 'si-o-no', 'Mayor o menor de edad', 'Un CONDICIONAL (if / else) deja que el programa tome decisiones: «SI se cumple algo, haz esto; SI NO, haz lo otro». Aquí preguntamos: ¿la edad es 18 años o más? Si sí, es mayor de edad. Si no, es menor.', 0)
  variant(db, r5b, 'js', 'Si input.edad es 18 años o más, muestra "mayor"; si no, muestra "menor".\n\n👉 >= significa "mayor o igual que". Si la edad es mayor o igual a 18, es mayor de edad.', 'if (input.edad >= 18) {\n  print("mayor")\n} else {\n  print("menor")\n}', ['>= significa "mayor o igual que": input.edad >= 18', 'Si se cumple, imprime "mayor"; si no (else), imprime "menor".', 'Cuidado: 18 años es MAYOR de edad, no menor.'])
  variant(db, r5b, 'python', 'Si input["edad"] es 18 años o más, muestra "mayor"; si no, muestra "menor".\n\n👉 >= significa "mayor o igual que". En Python el if termina en : y el cuerpo va indentado.', 'if input["edad"] >= 18:\n    print("mayor")\nelse:\n    print("menor")', ['En Python >= significa "mayor o igual que": input["edad"] >= 18', 'El if termina en : y el código dentro va indentado (con sangría).', 'En el else también termina con : y va indentado.'])
  variant(db, r5b, 'blocks', 'Si input.edad es 18 o más, muestra "mayor"; si no, muestra "menor".\n\n🧩 De «Lógica» coge el bloque «si … si no». En su hueco redondo, mete una comparación «__ ≥ __» (abre el menú y elige ≥). Compara «dato edad» con el número 18.', '', ['De «Datos» coge «dato edad» para leer la edad.', 'De «Lógica» coge el bloque de comparación «__ ≥ __» (elige ≥ en el menú).', 'Mete la comparación en el hueco del «si … si no» y dentro imprime "mayor" o "menor" según corresponda.'])
  tc(db, r5b, { edad: 18 }, 'mayor', 0)
  tc(db, r5b, { edad: 25 }, 'mayor', 1)
  tc(db, r5b, { edad: 10 }, 'menor', 2)

  const r6 = challenge(db, cond, 'par-impar', 'Par o impar', 'Un CONDICIONAL (if / else) deja que el programa tome decisiones: «SI se cumple algo, haz esto; SI NO, haz lo otro». Para saber si un número es par usamos el operador % (módulo), que da el RESTO de una división: si n entre 2 no sobra nada (resto 0), el número es par.', 1)
  variant(db, r6, 'js', 'Si input.n es par muestra "par"; si no, muestra "impar".\n\n👉 input.n % 2 da el resto de dividir entre 2. Si vale 0, es par.', 'if (input.n % 2 === 0) {\n  print("par")\n} else {\n  print("impar")\n}', ['% da el resto de una división: 4 % 2 vale 0, 7 % 2 vale 1.', 'Si input.n % 2 === 0 entonces es par; usa else para el caso impar.', '=== compara si dos valores son iguales.'])
  variant(db, r6, 'python', 'Si input["n"] es par muestra "par"; si no, muestra "impar".\n\n👉 input["n"] % 2 da el resto de dividir entre 2. Si vale 0, es par.', 'if input["n"] % 2 == 0:\n    print("par")\nelse:\n    print("impar")', ['% da el resto de una división: 4 % 2 vale 0, 7 % 2 vale 1.', 'En Python el if termina en : y el cuerpo va indentado (con sangría).', '== compara si dos valores son iguales.'])
  variant(db, r6, 'blocks', 'Si input.n es par muestra "par"; si no, muestra "impar".\n\n🧩 En «Matemáticas» está «residuo de __ ÷ __» (el resto). En «Lógica» tienes el bloque «si … si no» y el de comparar «__ = __». La idea: si el residuo de n ÷ 2 es igual a 0, es par.', '', ['Coge «residuo de __ ÷ __» («Matemáticas»): pon «dato n» y un 2.', 'Compáralo con 0 usando «__ = __» de «Lógica».', 'Mete esa comparación en el «si» del bloque «si … si no»: dentro del «si» imprime «par» y en el «si no» imprime «impar».'])
  tc(db, r6, { n: 4 }, 'par', 0)
  tc(db, r6, { n: 7 }, 'impar', 1)
  tc(db, r6, { n: 0 }, 'par', 2)

  const r7 = challenge(db, cond, 'signo', 'El signo del número', 'A veces no basta con dos opciones. Encadenando if / else if / else puedes distinguir TRES o más casos. Aquí un número será "positivo" (mayor que 0), "negativo" (menor que 0) o "cero".', 2)
  variant(db, r7, 'js', 'Según input.n, muestra "positivo", "negativo" o "cero".\n\n👉 Se comprueban las condiciones en orden: la primera que se cumpla gana.', 'if (input.n > 0) {\n  print("positivo")\n} else if (input.n < 0) {\n  print("negativo")\n} else {\n  print("cero")\n}', ['Encadena if / else if / else para cubrir los tres casos.', '> significa "mayor que" y < "menor que".', 'El else final atrapa el único caso que queda: el cero.'])
  variant(db, r7, 'python', 'Según input["n"], muestra "positivo", "negativo" o "cero".\n\n👉 Se comprueban las condiciones en orden: la primera que se cumpla gana.', 'n = input["n"]\nif n > 0:\n    print("positivo")\nelif n < 0:\n    print("negativo")\nelse:\n    print("cero")', ['En Python "else if" se escribe elif.', '> significa "mayor que" y < "menor que".', 'El else final atrapa el único caso que queda: el cero.'])
  variant(db, r7, 'blocks', 'Según input.n, muestra "positivo", "negativo" o "cero".\n\n🧩 El bloque «si … si no» de «Lógica» tiene una ruedita ⚙️: púlsala y arrastra «si no, si» para añadir un caso intermedio. Así cubres los tres casos: > 0, < 0 y el resto (cero).', '', ['Coge «si … si no» y con la ruedita ⚙️ añade un bloque «si no, si» para tener tres ramas.', 'Compara «dato n» con 0 usando «__ > __» en la primera rama y «__ < __» en la segunda.', 'Imprime «positivo», «negativo» y, en la rama final «si no», «cero».'])
  tc(db, r7, { n: 5 }, 'positivo', 0)
  tc(db, r7, { n: -3 }, 'negativo', 1)
  tc(db, r7, { n: 0 }, 'cero', 2)

  const r8 = challenge(db, cond, 'mayor-dos', 'El campeón', 'Comparar es una de las cosas que mejor hacen los ordenadores. Con un condicional decides cuál de dos números es el mayor. Truco: si usas «mayor o igual» (>=), cuando son iguales también funciona y muestras cualquiera de los dos.', 3)
  variant(db, r8, 'js', 'Muestra el mayor entre input.a e input.b. Si son iguales, muestra cualquiera.\n\n👉 >= significa "mayor o igual que".', 'if (input.a >= input.b) {\n  print(input.a)\n} else {\n  print(input.b)\n}', ['Compara con >= ("mayor o igual que").', 'Si a >= b, el mayor es a; si no, es b.', 'Usar >= resuelve el empate sin tener que comprobarlo aparte.'])
  variant(db, r8, 'python', 'Muestra el mayor entre input["a"] e input["b"]. Si son iguales, muestra cualquiera.\n\n👉 >= significa "mayor o igual que".', 'a, b = input["a"], input["b"]\nif a >= b:\n    print(a)\nelse:\n    print(b)', ['Compara con >= ("mayor o igual que").', 'Puedes guardar ambos valores de una vez: a, b = input["a"], input["b"]', 'Usar >= resuelve el empate sin comprobarlo aparte.'])
  variant(db, r8, 'blocks', 'Muestra el mayor entre input.a e input.b. Si son iguales, muestra cualquiera.\n\n🧩 En el bloque de comparar «__ = __» de «Lógica» puedes abrir el menú y elegir «≥» (mayor o igual). Si a ≥ b, el mayor es a; si no, es b.', '', ['Compara «dato a» y «dato b» con «__ ≥ __» (elige ≥ en el menú del bloque de «Lógica»).', 'Mete esa comparación en el «si» del bloque «si … si no».', 'En el «si» imprime «dato a»; en el «si no» imprime «dato b».'])
  tc(db, r8, { a: 8, b: 3 }, '8', 0)
  tc(db, r8, { a: 2, b: 9 }, '9', 1)
  tc(db, r8, { a: 5, b: 5 }, '5', 2)

  const r9 = challenge(db, cond, 'fizzbuzz', 'FizzBuzz', 'El reto más famoso para practicar condicionales. Recorres los números y, según sus divisores, dices una palabra u otra. La clave es el ORDEN: como un múltiplo de 15 también lo es de 3 y de 5, debes comprobar primero el caso de 15 o nunca llegarás a decir "FizzBuzz".', 4)
  variant(db, r9, 'js', 'Recorre del 1 a input.hasta. Múltiplo de 3→"Fizz", de 5→"Buzz", de ambos (15)→"FizzBuzz", y si no, el propio número.\n\n👉 Combina un bucle con if encadenados.', 'for (let i = 1; i <= input.hasta; i++) {\n  if (i % 15 === 0) print("FizzBuzz")\n  else if (i % 3 === 0) print("Fizz")\n  else if (i % 5 === 0) print("Buzz")\n  else print(i)\n}', ['Múltiplo de 3 es i % 3 === 0; múltiplo de 5 es i % 5 === 0.', 'Comprueba PRIMERO el múltiplo de 15, antes que el de 3 o el de 5.', 'El else final imprime el número tal cual cuando no es múltiplo de nada.'])
  variant(db, r9, 'python', 'Recorre del 1 a input["hasta"]. Múltiplo de 3→"Fizz", de 5→"Buzz", de ambos (15)→"FizzBuzz", y si no, el propio número.\n\n👉 Combina un bucle con if / elif encadenados.', 'for i in range(1, input["hasta"] + 1):\n    if i % 15 == 0:\n        print("FizzBuzz")\n    elif i % 3 == 0:\n        print("Fizz")\n    elif i % 5 == 0:\n        print("Buzz")\n    else:\n        print(i)', ['Múltiplo de 3 es i % 3 == 0; múltiplo de 5 es i % 5 == 0.', 'Comprueba PRIMERO el múltiplo de 15, antes que el de 3 o el de 5.', 'El else final imprime el número tal cual cuando no es múltiplo de nada.'])
  variant(db, r9, 'blocks', 'Reto experto 🧠 Recorre del 1 a input.hasta. Múltiplo de 3→"Fizz", de 5→"Buzz", de ambos (15)→"FizzBuzz", y si no, el propio número.\n\n🧩 «contar con i desde 1 hasta __» («Bucles») para recorrer. Dentro, un «si … si no» de «Lógica» con varias ramas (ábrelo con la ruedita ⚙️). Para "múltiplo de 3" usa «residuo de i ÷ 3 = 0».', '', ['Pon «contar con i desde 1 hasta __» y en el «hasta» mete «dato hasta».', 'Dentro coge «si … si no» y, con la ruedita ⚙️, añade 2 ramas «si no, si» (quedan: si / si no si / si no si / si no).', 'Cada condición es «residuo de i ÷ N = 0»: usa «residuo de __ ÷ __» («Matemáticas») comparado con 0 («Lógica»).', 'MUY IMPORTANTE el orden: primera rama ÷15→FizzBuzz, luego ÷3→Fizz, luego ÷5→Buzz, y en el «si no» final imprime la variable i.'])
  tc(db, r9, { hasta: 15 }, ['1','2','Fizz','4','Buzz','Fizz','7','8','Fizz','Buzz','11','Fizz','13','14','FizzBuzz'].join('\n'), 0)
  tc(db, r9, { hasta: 3 }, '1\n2\nFizz', 1)

  // ── Bucles (loops, ord 4) ───────────────────────────────────────────────────

  const r5 = challenge(db, loops, 'contar', 'Cuenta hasta el final', 'Un BUCLE repite las mismas órdenes muchas veces sin que tengas que copiarlas. En vez de escribir "imprimir" diez veces, le dices al bucle: «repite esto contando del 1 al 10». ¡Mucho más cómodo!', 0)
  variant(db, r5, 'js', 'Por cada número del 1 hasta input.hasta (incluido), muestra "Hola N" en su propia línea. Ej.: Hola 1, Hola 2, …\n\n👉 El bucle for repite con un contador i que sube de uno en uno.', 'for (let i = 1; i <= input.hasta; i++) {\n  print("Hola " + i)\n}', ['El bucle for (let i = 1; i <= input.hasta; i++) repite contando desde 1.', 'i vale 1, luego 2, luego 3… úsalo dentro del bucle.', 'Pega el texto y el número con +: "Hola " + i'])
  variant(db, r5, 'python', 'Por cada número del 1 hasta input["hasta"] (incluido), muestra "Hola N" en su propia línea. Ej.: Hola 1, Hola 2, …\n\n👉 range(1, n+1) genera los números del 1 al n.', 'for i in range(1, input["hasta"] + 1):\n    print(f"Hola {i}")', ['range(1, n+1) incluye el 1 y llega hasta n (el +1 hace que n entre).', 'i toma cada valor del rango, uno por vuelta.', 'Una f-string mete el número en el texto: f"Hola {i}"'])
  variant(db, r5, 'blocks', 'Muestra Hola 1, Hola 2, … hasta llegar a input.hasta, cada uno en su línea.\n\n🧩 El bloque naranja «contar con [i] desde [1] hasta __» («Bucles») lleva la cuenta solo. En el «hasta» mete «dato hasta». Dentro usa «combinar textos» para unir «Hola » con la variable i.', '', ['De «Bucles» coge «contar con i desde 1 hasta …» y en el «hasta» mete «dato hasta» (de «Datos»).', 'Dentro de la boca del bucle pon «imprimir».', 'Usa «combinar textos» («Imprimir»): primer hueco el texto «Hola », segundo hueco la variable «i» del contador.'])
  tc(db, r5, { hasta: 10 }, Array.from({ length: 10 }, (_, i) => `Hola ${i + 1}`).join('\n'), 0)
  tc(db, r5, { hasta: 1 }, 'Hola 1', 1)

  const r10 = challenge(db, loops, 'suma-rango', 'La suma perfecta', 'Un ACUMULADOR es una variable que empieza en 0 y va creciendo dentro de un bucle. En cada vuelta le sumas algo y, al terminar, contiene el total. Es el patrón para sumar muchos números sin escribirlos todos.', 1)
  variant(db, r10, 'js', 'Suma todos los números del 1 a input.n (incluido) y muestra el total.\n\n👉 Crea suma = 0 ANTES del bucle y dentro haz suma = suma + i.', 'let suma = 0\nfor (let i = 1; i <= input.n; i++) {\n  suma = suma + i\n}\nprint(suma)', ['Crea el acumulador antes del bucle: let suma = 0', 'Dentro del bucle añade el contador: suma = suma + i', 'Imprime suma SOLO al final, fuera del bucle.'])
  variant(db, r10, 'python', 'Suma todos los números del 1 a input["n"] (incluido) y muestra el total.\n\n👉 Crea suma = 0 ANTES del bucle y dentro haz suma = suma + i.', 'suma = 0\nfor i in range(1, input["n"] + 1):\n    suma = suma + i\nprint(suma)', ['Crea el acumulador antes del bucle: suma = 0', 'Dentro del bucle añade el contador: suma = suma + i', 'Imprime suma SOLO al final, sin sangría (fuera del bucle).'])
  tc(db, r10, { n: 5 }, '15', 0)
  tc(db, r10, { n: 10 }, '55', 1)
  tc(db, r10, { n: 1 }, '1', 2)

  const r11 = challenge(db, loops, 'tabla-multiplicar', 'La tabla del saber', 'La tabla de multiplicar es un bucle perfecto: el mismo cálculo repetido cambiando un número. Recorrerás del 1 al 10 y, en cada vuelta, multiplicarás por input.n. Fíjate bien en el FORMATO del texto, porque tiene que salir igualito.', 2)
  variant(db, r11, 'js', 'Muestra la tabla de input.n del 1 al 10, con el formato exacto "N x I = RESULTADO" (un renglón por línea).\n\n👉 Une textos y números con +; ojo a los espacios alrededor de la x y el =.', 'for (let i = 1; i <= 10; i++) {\n  print(input.n + " x " + i + " = " + (input.n * i))\n}', ['Recorre del 1 al 10 con el bucle for.', 'Une texto y números con +, respetando los espacios: " x " y " = ".', 'El resultado es input.n * i; ponlo entre paréntesis para que se calcule antes de unirse.'])
  variant(db, r11, 'python', 'Muestra la tabla de input["n"] del 1 al 10, con el formato exacto "N x I = RESULTADO" (un renglón por línea).\n\n👉 Las f-strings meten valores dentro del texto con llaves {}.', 'for i in range(1, 11):\n    n = input["n"]\n    print(f"{n} x {i} = {n * i}")', ['range(1, 11) recorre del 1 al 10 (el 11 no entra).', 'Usa una f-string: f"{n} x {i} = {n * i}"', 'Respeta los espacios alrededor de la x y del = para que coincida exactamente.'])
  tc(db, r11, { n: 3 }, Array.from({ length: 10 }, (_, i) => `3 x ${i+1} = ${3*(i+1)}`).join('\n'), 0)
  tc(db, r11, { n: 1 }, Array.from({ length: 10 }, (_, i) => `1 x ${i+1} = ${i+1}`).join('\n'), 1)

  const r12 = challenge(db, loops, 'invertir', 'Al revés', 'Una LISTA guarda varios valores en orden, y cada uno tiene una POSICIÓN (índice) que empieza en 0. Para recorrerla al revés, en vez de empezar en 0 y subir, empiezas en la última posición y bajas hasta 0.', 3)
  variant(db, r12, 'js', 'Dado input.items (una lista de números), muéstralos del último al primero, uno por línea.\n\n👉 La última posición es items.length - 1; baja restando con i--.', 'for (let i = input.items.length - 1; i >= 0; i--) {\n  print(input.items[i])\n}', ['La primera posición es 0 y la última es items.length - 1.', 'Empieza el contador en items.length - 1 y baja con i--.', 'El bucle sigue mientras i >= 0 (incluye la posición 0).'])
  variant(db, r12, 'python', 'Dado input["items"] (una lista de números), muéstralos del último al primero, uno por línea.\n\n👉 range(inicio, fin, paso) con paso -1 cuenta hacia atrás.', 'items = input["items"]\nfor i in range(len(items) - 1, -1, -1):\n    print(items[i])', ['len(items) es cuántos elementos hay; la última posición es len - 1.', 'range(len-1, -1, -1): empieza en la última, baja de uno en uno y se para antes de -1 (o sea, en 0).', 'Lee cada elemento con items[i].'])
  tc(db, r12, { items: [1, 2, 3] }, '3\n2\n1', 0)
  tc(db, r12, { items: [10, 20] }, '20\n10', 1)
  tc(db, r12, { items: [7] }, '7', 2)

  const r13 = challenge(db, loops, 'contar-pares', 'Solo los pares', 'FILTRAR es recorrer una lista y quedarte solo con lo que cumple una condición. Aquí combinas dos cosas que ya conoces: un bucle (para visitar cada número) y un condicional (para decidir si lo muestras).', 4)
  variant(db, r13, 'js', 'Dado input.items, muestra solo los números pares, uno por línea.\n\n👉 Dentro del bucle, un if con % 2 === 0 decide si imprimir.', 'for (let i = 0; i < input.items.length; i++) {\n  if (input.items[i] % 2 === 0) {\n    print(input.items[i])\n  }\n}', ['Recorre la lista con un bucle for.', 'Dentro, usa un if para comprobar si el número es par (% 2 === 0).', 'Solo imprimes cuando la condición se cumple; los impares se saltan.'])
  variant(db, r13, 'python', 'Dado input["items"], muestra solo los números pares, uno por línea.\n\n👉 for x in lista recorre los valores directamente, sin índices.', 'for x in input["items"]:\n    if x % 2 == 0:\n        print(x)', ['for x in input["items"] te da cada número en x, uno por vuelta.', 'Dentro, un if con x % 2 == 0 comprueba si es par.', 'Solo imprimes cuando la condición se cumple; los impares se saltan.'])
  tc(db, r13, { items: [1,2,3,4,5,6] }, '2\n4\n6', 0)
  tc(db, r13, { items: [1,3,5] }, '', 1)
  tc(db, r13, { items: [2,4] }, '2\n4', 2)

  // ── Funciones (funcs, ord 5) ────────────────────────────────────────────────

  const r14 = challenge(db, funcs, 'funcion-saludo', 'Mi primera función', 'Una FUNCIÓN es un mini-programa con nombre que guardas para usarlo siempre que quieras. Recibe datos de entrada (los PARÁMETROS, escritos entre paréntesis) y con return DEVUELVE un resultado. Primero se DEFINE y luego se LLAMA por su nombre.', 0)
  variant(db, r14, 'js', 'Crea la función saludar(nombre) que devuelva "Hola, NOMBRE!". Después llámala con input.nombre y muestra el resultado.\n\n👉 return entrega el valor; print(saludar(...)) lo muestra.', 'function saludar(nombre) {\n  return "Hola, " + nombre + "!"\n}\nprint(saludar(input.nombre))', ['function saludar(nombre) { ... } define la función; nombre es el parámetro.', 'return "Hola, " + nombre + "!" devuelve el saludo (no lo imprime aún).', 'Llámala y muéstrala: print(saludar(input.nombre))'])
  variant(db, r14, 'python', 'Crea la función saludar(nombre) que devuelva "Hola, NOMBRE!". Después llámala con input["nombre"] y muestra el resultado.\n\n👉 return entrega el valor; print(saludar(...)) lo muestra.', 'def saludar(nombre):\n    return "Hola, " + nombre + "!"\nprint(saludar(input["nombre"]))', ['def saludar(nombre): define la función; nombre es el parámetro.', 'return "Hola, " + nombre + "!" devuelve el saludo (no lo imprime aún).', 'Llámala y muéstrala: print(saludar(input["nombre"]))'])
  variant(db, r14, 'blocks', 'Crea una función «saludar» con un parámetro «nombre» que devuelva "Hola, NOMBRE!". Llámala con el dato nombre y muestra el resultado.\n\n🧩 En «Funciones», coge el bloque «para [hacer algo] devolver»: con su ruedita ⚙️ añádele una entrada llamada nombre. Combina «Hola, » + nombre + «!» con «combinar textos».', '', ['En «Funciones» arrastra el bloque que «devuelve», renómbralo saludar y con la ruedita ⚙️ añade la entrada nombre.', 'Dentro, en «devolver», pon «combinar textos» uniendo «Hola, », la variable «nombre» y «!».', 'Aparecerá el bloque «saludar __»: méte «dato nombre» y enchúfalo dentro de «imprimir».'])
  tc(db, r14, { nombre: 'Ana' }, 'Hola, Ana!', 0)
  tc(db, r14, { nombre: 'Mundo' }, 'Hola, Mundo!', 1)

  const r15 = challenge(db, funcs, 'potencia', 'La potencia de los bucles', 'Una potencia base^exp es multiplicar la base por sí misma exp veces (2^3 = 2·2·2 = 8). Aquí juntas dos ideas: una función que recibe base y exp, y dentro un acumulador que multiplica en un bucle. Pista clave: el acumulador empieza en 1, porque cualquier número elevado a 0 vale 1.', 1)
  variant(db, r15, 'js', 'Crea potencia(base, exp) que devuelva base elevado a exp usando un bucle. Muestra potencia(input.base, input.exp).\n\n👉 El acumulador empieza en 1 y se multiplica exp veces.', 'function potencia(base, exp) {\n  let resultado = 1\n  for (let i = 0; i < exp; i++) {\n    resultado = resultado * base\n  }\n  return resultado\n}\nprint(potencia(input.base, input.exp))', ['Empieza el acumulador en 1 (no en 0), si no todo daría 0.', 'El bucle repite exp veces: resultado = resultado * base.', 'Si exp es 0 el bucle no se ejecuta y devuelves 1, ¡que es lo correcto!'])
  variant(db, r15, 'python', 'Crea potencia(base, exp) que devuelva base elevado a exp usando un bucle. Muestra potencia(input["base"], input["exp"]).\n\n👉 El acumulador empieza en 1 y se multiplica exp veces.', 'def potencia(base, exp):\n    resultado = 1\n    for i in range(exp):\n        resultado = resultado * base\n    return resultado\nprint(potencia(input["base"], input["exp"]))', ['Empieza el acumulador en 1 (no en 0), si no todo daría 0.', 'range(exp) ejecuta el cuerpo exactamente exp veces.', 'Si exp es 0 el bucle no se ejecuta y devuelves 1, ¡que es lo correcto!'])
  variant(db, r15, 'blocks', 'Reto experto 🧠 Crea una función «potencia» con entradas base y exp que devuelva base elevado a exp usando un bucle. Llámala con los datos base y exp y muestra el resultado.\n\n🧩 En «Funciones» coge el bloque que «devuelve» y, con la ruedita ⚙️, añádele dos entradas: base y exp. Repite la multiplicación con «repetir __ veces» («Bucles»).', '', ['Crea la función con dos entradas (base, exp) usando la ruedita ⚙️ del bloque que «devuelve».', 'Dentro, primero «poner resultado a 1» («Variables» + un número 1).', 'Añade «repetir __ veces» con el valor «exp»; dentro pon «poner resultado a (resultado × base)».', 'En «devolver» pon la variable resultado. Fuera, mete «potencia (dato base) (dato exp)» dentro de «imprimir».'])
  tc(db, r15, { base: 2, exp: 10 }, '1024', 0)
  tc(db, r15, { base: 3, exp: 3 }, '27', 1)
  tc(db, r15, { base: 5, exp: 0 }, '1', 2)

  const r16 = challenge(db, funcs, 'es-primo', '¿Primo o no primo?', 'Un número PRIMO solo se puede dividir exactamente por 1 y por sí mismo (2, 3, 5, 7, 11…). Para comprobarlo buscas si tiene algún otro divisor. Truco de eficiencia: no hace falta probar hasta n; basta con probar mientras i·i ≤ n. Y recuerda: los números menores que 2 no son primos.', 2)
  variant(db, r16, 'js', 'Crea esPrimo(n) que devuelva true/false. Según el resultado, muestra "primo" o "no primo" para input.n.\n\n👉 Si encuentras un divisor, ya NO es primo: puedes return false al instante.', 'function esPrimo(n) {\n  if (n < 2) return false\n  for (let i = 2; i * i <= n; i++) {\n    if (n % i === 0) return false\n  }\n  return true\n}\nprint(esPrimo(input.n) ? "primo" : "no primo")', ['Caso aparte: si n < 2, devuelve false directamente.', 'Prueba divisores desde 2 mientras i * i <= n; si alguno divide exacto (n % i === 0), no es primo.', 'cond ? "primo" : "no primo" elige el texto según el true/false.'])
  variant(db, r16, 'python', 'Crea es_primo(n) que devuelva True/False. Según el resultado, muestra "primo" o "no primo" para input["n"].\n\n👉 Si encuentras un divisor, ya NO es primo: puedes return False al instante.', 'def es_primo(n):\n    if n < 2:\n        return False\n    i = 2\n    while i * i <= n:\n        if n % i == 0:\n            return False\n        i = i + 1\n    return True\nn = input["n"]\nprint("primo" if es_primo(n) else "no primo")', ['Caso aparte: si n < 2, devuelve False directamente.', 'Prueba divisores con un while mientras i * i <= n; si n % i == 0, no es primo.', '"primo" if es_primo(n) else "no primo" elige el texto según el True/False.'])
  variant(db, r16, 'blocks', 'Reto experto 🧠 Crea una función «esPrimo» con entrada n que devuelva verdadero/falso. Luego, según el resultado para el dato n, muestra "primo" o "no primo".\n\n🧩 Truco con una bandera: una variable que empieza en verdadero y se pone en falso si encuentras un divisor. Necesitas «Funciones», «Bucles», «residuo» y comparaciones de «Lógica».', '', ['Crea la función «esPrimo» con una entrada n (ruedita ⚙️ del bloque que «devuelve»).', 'Dentro: «poner primo a (n ≥ 2)» usando «__ ≥ __» de «Lógica» (los menores que 2 no son primos).', 'Añade «contar con i desde 2 hasta (n − 1)»; dentro, «si (residuo de n ÷ i = 0)» entonces «poner primo a falso».', 'En «devolver» pon la variable primo. Fuera, un «si esPrimo(dato n) … si no» que imprime «primo» o «no primo».'])
  tc(db, r16, { n: 7 }, 'primo', 0)
  tc(db, r16, { n: 10 }, 'no primo', 1)
  tc(db, r16, { n: 2 }, 'primo', 2)
  tc(db, r16, { n: 1 }, 'no primo', 3)
}
