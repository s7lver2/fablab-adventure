import type Database from 'better-sqlite3'

/** Siembra un currículo lineal mínimo (idempotente). Reto 1: print. Reto 2: bucles. */
export function seedCurriculum(db: Database.Database): void {
  const already = db.prepare('SELECT 1 FROM challenges LIMIT 1').get()
  if (already) return

  const concept = db
    .prepare("INSERT INTO concepts (slug, name, description, ord) VALUES ('fundamentos', 'Fundamentos', 'Primeros pasos', 0)")
    .run()
  const conceptId = Number(concept.lastInsertRowid)

  // Reto 1: imprimir un saludo.
  const c1 = db
    .prepare("INSERT INTO challenges (concept_id, slug, title, narrative, ord) VALUES (?, 'saludo', 'Tu primer saludo', 'Haz que el ordenador salude.', 0)")
    .run(conceptId)
  const c1Id = Number(c1.lastInsertRowid)
  db.prepare(
    `INSERT INTO challenge_variants (challenge_id, language, statement, starter_code, hints_json)
     VALUES (?, 'js', 'Imprime exactamente: Hola mundo', 'print("...")', ?)`,
  ).run(c1Id, JSON.stringify(['Usa print("Hola mundo")']))
  db.prepare("INSERT INTO test_cases (challenge_id, input_json, expected_output, ord) VALUES (?, 'null', 'Hola mundo', 0)").run(c1Id)

  // Reto 2: bucle del 1 al N (entrada FIJA grande para impedir trampa a mano).
  const c2 = db
    .prepare("INSERT INTO challenges (concept_id, slug, title, narrative, ord) VALUES (?, 'contar', 'Cuenta hasta el final', 'Saluda a cada número.', 1)")
    .run(conceptId)
  const c2Id = Number(c2.lastInsertRowid)
  db.prepare(
    `INSERT INTO challenge_variants (challenge_id, language, statement, starter_code, hints_json)
     VALUES (?, 'js', 'Imprime "Hola N" para cada N de 1 a input.hasta (incluido), uno por línea.', 'for (let i = 1; i <= input.hasta; i++) {\n  // tu código\n}', ?)`,
  ).run(c2Id, JSON.stringify(['Usa print dentro de un bucle for']))
  const hasta = 1000
  const expected = Array.from({ length: hasta }, (_, i) => `Hola ${i + 1}`).join('\n')
  db.prepare('INSERT INTO test_cases (challenge_id, input_json, expected_output, ord) VALUES (?, ?, ?, 0)').run(
    c2Id,
    JSON.stringify({ hasta }),
    expected,
  )
}
