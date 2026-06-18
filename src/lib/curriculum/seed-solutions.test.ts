import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createSchema } from '../db/schema'
import { seedCurriculum } from './seed'
import { CurriculumRepository } from './repository'
import { runJs } from '../engine/js-runner'

// slug -> solución JS de referencia. Se amplía en tareas posteriores.
const SOLUTIONS: Record<string, string> = {
  'primera-cuenta': 'print(2 + 3)',
  'imprimir-numeros': 'print(7)',
  'guardar-numero': 'let edad = 10\nprint(edad)',
  'caja-cuenta': 'let a = 5\nlet b = 3\nprint(a + b)',
  'juntar-textos': 'let nombre = "Lia"\nprint("Hola, " + nombre + ". ¿Qué tal?")',
  'mi-nombre': 'let nombre = "Mundo"\nprint("Hola, " + nombre)',
  'que-es-input': 'print("Tu número es " + input.n)',
  suma: 'print(input.a + input.b)',
  doble: 'print(input.n * 2)',
  contar: 'for (let i = 1; i <= input.hasta; i++) {\n  print("Hola " + i)\n}',
  'par-impar': 'if (input.n % 2 === 0) {\n  print("par")\n} else {\n  print("impar")\n}',
  signo: 'if (input.n > 0) {\n  print("positivo")\n} else if (input.n < 0) {\n  print("negativo")\n} else {\n  print("cero")\n}',
  'mayor-dos': 'if (input.a >= input.b) {\n  print(input.a)\n} else {\n  print(input.b)\n}',
  fizzbuzz: 'for (let i = 1; i <= input.hasta; i++) {\n  if (i % 15 === 0) print("FizzBuzz")\n  else if (i % 3 === 0) print("Fizz")\n  else if (i % 5 === 0) print("Buzz")\n  else print(i)\n}',
  'suma-rango': 'let suma = 0\nfor (let i = 1; i <= input.n; i++) {\n  suma = suma + i\n}\nprint(suma)',
  'tabla-multiplicar': 'for (let i = 1; i <= 10; i++) {\n  print(input.n + " x " + i + " = " + (input.n * i))\n}',
  invertir: 'for (let i = input.items.length - 1; i >= 0; i--) {\n  print(input.items[i])\n}',
  'contar-pares': 'for (let i = 0; i < input.items.length; i++) {\n  if (input.items[i] % 2 === 0) {\n    print(input.items[i])\n  }\n}',
  'funcion-saludo': 'function saludar(nombre) {\n  return "Hola, " + nombre + "!"\n}\nprint(saludar(input.nombre))',
  operaciones: 'print(10 - 4)\nprint(3 * 5)',
  potencia: 'function potencia(base, exp) {\n  let r = 1\n  for (let i = 0; i < exp; i++) { r = r * base }\n  return r\n}\nprint(potencia(input.base, input.exp))',
  'es-primo': 'function esPrimo(n) {\n  if (n < 2) return false\n  for (let i = 2; i * i <= n; i++) {\n    if (n % i === 0) return false\n  }\n  return true\n}\nprint(esPrimo(input.n) ? "primo" : "no primo")',
  saludo: 'print("Hola mundo")',
  'varias-lineas': 'print("Hola")\nprint("me llamo Robot")\nprint("adiós")',
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
